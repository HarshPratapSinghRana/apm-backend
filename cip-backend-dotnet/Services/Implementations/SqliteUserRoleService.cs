using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using EngineeringCommons.Backend.Data;
using EngineeringCommons.Backend.Models;
using EngineeringCommons.Backend.Services.Interfaces;

namespace EngineeringCommons.Backend.Services.Implementations;

public class SqliteUserRoleService : IUserRoleService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly INotificationService _notifications;
    private readonly IEmailNotificationService _emailService;
    private readonly ITokenService _tokens;
    private readonly IConfiguration _config;
    private readonly ILogger<SqliteUserRoleService> _logger;
    private readonly IHttpClientFactory? _httpFactory;

    public SqliteUserRoleService(
        IServiceScopeFactory scopeFactory,
        INotificationService notifications,
        IEmailNotificationService emailService,
        ITokenService tokens,
        IConfiguration config,
        ILogger<SqliteUserRoleService> logger,
        IHttpClientFactory? httpFactory = null)
    {
        _scopeFactory = scopeFactory;
        _notifications = notifications;
        _emailService = emailService;
        _tokens = tokens;
        _config = config;
        _logger = logger;
        _httpFactory = httpFactory;
    }

    private string? GetConfiguredAdminEmail()
    {
        return _config["AdminEmail"] 
            ?? _config.GetSection("AdminEmails").Get<string[]>()?.FirstOrDefault();
    }

    public Task<bool> IsAdminAsync(string email)
    {
        if (string.IsNullOrWhiteSpace(email)) return Task.FromResult(false);
        var norm = email.Trim().ToLowerInvariant();

        var configured = GetConfiguredAdminEmail();
        if (!string.IsNullOrEmpty(configured) && string.Equals(norm, configured.Trim().ToLowerInvariant(), StringComparison.OrdinalIgnoreCase))
        {
            return Task.FromResult(true);
        }

        var adminConfig = _config.GetSection("AdminEmails").Get<string[]>()
            ?? _config["AdminEmail"]?.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            ?? Array.Empty<string>();

        foreach (var admin in adminConfig)
        {
            if (norm == admin.Trim().ToLowerInvariant())
            {
                return Task.FromResult(true);
            }
        }

        return Task.FromResult(false);
    }

    public async Task<string> ResolveUserRoleAsync(string email)
    {
        if (string.IsNullOrWhiteSpace(email)) return "CONSUMER";
        var norm = email.Trim().ToLowerInvariant();

        if (await IsAdminAsync(norm))
        {
            return "ADMIN";
        }

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CipDbContext>();

        var assignment = await db.UserRoleAssignments.FirstOrDefaultAsync(u => u.UserEmail.ToLower() == norm);
        if (assignment != null && !string.IsNullOrWhiteSpace(assignment.Role))
        {
            return assignment.Role.ToUpperInvariant();
        }

        // Standard corporate MAQ users default strictly to CONSUMER unless email matches designated test producer/reviewer alias
        bool isTestDomain = norm.EndsWith("@company.com", StringComparison.OrdinalIgnoreCase) || norm.EndsWith("@test.com", StringComparison.OrdinalIgnoreCase);
        bool isReviewerAlias = norm.StartsWith("reviewer@", StringComparison.OrdinalIgnoreCase) || 
                               norm.StartsWith("designated-rev@", StringComparison.OrdinalIgnoreCase) ||
                               (isTestDomain && norm.Contains("reviewer", StringComparison.OrdinalIgnoreCase));
        bool isProducerAlias = norm.StartsWith("producer@", StringComparison.OrdinalIgnoreCase) || 
                               norm.StartsWith("contrib@", StringComparison.OrdinalIgnoreCase) ||
                               norm.StartsWith("contributor@", StringComparison.OrdinalIgnoreCase) ||
                               (isTestDomain && (norm.Contains("producer", StringComparison.OrdinalIgnoreCase) || norm.Contains("contributor", StringComparison.OrdinalIgnoreCase)));

        var defaultRole = await IsAdminAsync(norm) ? "ADMIN" : (isReviewerAlias ? "REVIEWER" : (isProducerAlias ? "CONTRIBUTOR" : "CONSUMER"));
        try
        {
            db.UserRoleAssignments.Add(new UserRoleAssignment
            {
                UserEmail = norm,
                Role = defaultRole,
                IsCertifiedReviewer = defaultRole == "ADMIN",
                GrantedBy = "SYSTEM",
                Notes = "Auto-registered default role",
                GrantedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
            TriggerAdoSync();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to persist auto-registered role for user in database.");
        }

        return defaultRole;
    }

    public async Task<bool> IsCertifiedReviewerAsync(string email)
    {
        if (string.IsNullOrWhiteSpace(email)) return false;
        var norm = email.Trim().ToLowerInvariant();

        if (await IsAdminAsync(norm)) return true;

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CipDbContext>();

        var assignment = await db.UserRoleAssignments.FirstOrDefaultAsync(u => u.UserEmail.ToLower() == norm);
        return assignment != null && assignment.IsCertifiedReviewer;
    }

    public async Task<UserAccessRequest> SubmitAccessRequestAsync(string userEmail, string requestedRole, string? reason)
    {
        if (string.IsNullOrWhiteSpace(userEmail)) throw new ArgumentException("User email is required", nameof(userEmail));
        var norm = userEmail.Trim().ToLowerInvariant();
        var targetRole = !string.IsNullOrWhiteSpace(requestedRole) ? requestedRole.Trim().ToUpperInvariant() : "CONTRIBUTOR";

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CipDbContext>();

        // Check if pending request exists
        var existingPending = await db.AccessRequests
            .FirstOrDefaultAsync(r => r.UserEmail.ToLower() == norm && r.Status == AccessRequestStatus.Pending);

        if (existingPending != null)
        {
            _logger.LogInformation("Existing pending access request found for {UserEmail} (ID: {RequestId})", norm, existingPending.Id);
            return existingPending;
        }

        var currentRole = await ResolveUserRoleAsync(norm);
        var adminRecipient = GetConfiguredAdminEmail();
        var request = new UserAccessRequest
        {
            Id = Guid.NewGuid().ToString(),
            UserEmail = norm,
            RequestedRole = targetRole,
            CurrentRole = currentRole,
            Status = AccessRequestStatus.Pending,
            Reason = reason,
            AdminEmail = adminRecipient,
            RequestedAt = DateTime.UtcNow
        };

        db.AccessRequests.Add(request);
        await db.SaveChangesAsync();
        TriggerAdoSync();

        // 1. Create In-App Notification for Admin
        try
        {
            await _notifications.CreateNotificationAsync(new Notification
            {
                RecipientEmail = adminRecipient,
                Title = $"Access Request ({targetRole}) from {norm}",
                Message = $"User {norm} has requested {targetRole} access. Reason: {reason ?? "None provided"}",
                Type = NotificationType.AccessRequested,
                ReferenceId = $"access_req_{request.Id}",
                SubmissionId = request.Id,
                CreatedAt = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to create in-app notification for admin regarding access request {RequestId}", request.Id);
        }

        // 2. Dispatch Email to Admin (COMMENTED OUT FOR NOW)
        /*
        try
        {
            await _emailService.SendAccessRequestNotificationAsync(adminRecipient, norm, targetRole, request.Id, reason);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to dispatch email to admin regarding access request {RequestId}", request.Id);
        }
        */

        return request;
    }

    public async Task<IEnumerable<UserAccessRequest>> GetAccessRequestsAsync(string? status = null)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CipDbContext>();

        IQueryable<UserAccessRequest> query = db.AccessRequests.OrderByDescending(r => r.RequestedAt);

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<AccessRequestStatus>(status, true, out var parsedStatus))
        {
            query = query.Where(r => r.Status == parsedStatus);
        }

        return await query.ToListAsync();
    }

    public async Task<IEnumerable<UserAccessRequest>> GetUserRequestsAsync(string userEmail)
    {
        if (string.IsNullOrWhiteSpace(userEmail)) return Enumerable.Empty<UserAccessRequest>();
        var norm = userEmail.Trim().ToLowerInvariant();

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CipDbContext>();

        return await db.AccessRequests
            .Where(r => r.UserEmail.ToLower() == norm)
            .OrderByDescending(r => r.RequestedAt)
            .ToListAsync();
    }

    public async Task<UserAccessRequest?> ApproveRequestAsync(string requestId, string adminEmail, string? notes = null)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CipDbContext>();

        var request = await db.AccessRequests.FirstOrDefaultAsync(r => r.Id == requestId);
        if (request == null) return null;

        request.Status = AccessRequestStatus.Approved;
        request.AdminEmail = adminEmail;
        request.AdminNotes = notes;
        request.ReviewedAt = DateTime.UtcNow;

        var norm = request.UserEmail.ToLowerInvariant();
        var assignment = await db.UserRoleAssignments.FirstOrDefaultAsync(a => a.UserEmail.ToLower() == norm);
        if (assignment == null)
        {
            assignment = new UserRoleAssignment
            {
                UserEmail = norm,
                Role = request.RequestedRole,
                IsCertifiedReviewer = request.RequestedRole == "CERTIFIED_REVIEWER",
                GrantedBy = adminEmail,
                Notes = notes,
                GrantedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            db.UserRoleAssignments.Add(assignment);
        }
        else
        {
            assignment.Role = request.RequestedRole;
            if (request.RequestedRole == "CERTIFIED_REVIEWER")
            {
                assignment.IsCertifiedReviewer = true;
            }
            assignment.GrantedBy = adminEmail;
            assignment.Notes = notes;
            assignment.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync();
        TriggerAdoSync();

        // Notify User In-App
        try
        {
            await _notifications.CreateNotificationAsync(new Notification
            {
                RecipientEmail = norm,
                Title = "Access Request Approved",
                Message = $"Your request for {request.RequestedRole} role has been approved by admin {adminEmail}.",
                Type = NotificationType.AccessApproved,
                ReferenceId = $"approved_access_{request.Id}",
                SubmissionId = request.Id,
                CreatedAt = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to create in-app notification for access request rejection (Request ID: {RequestId}).", request.Id);
        }

        // Send Email to User (COMMENTED OUT FOR NOW)
        /*
        try
        {
            await _emailService.SendAccessDecisionNotificationAsync(norm, "APPROVED", request.RequestedRole, notes);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to persist auto-registered role for user in database.");
        }
        */

        return request;
    }

    public async Task<UserAccessRequest?> RejectRequestAsync(string requestId, string adminEmail, string? notes = null)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CipDbContext>();

        var request = await db.AccessRequests.FirstOrDefaultAsync(r => r.Id == requestId);
        if (request == null) return null;

        request.Status = AccessRequestStatus.Rejected;
        request.AdminEmail = adminEmail;
        request.AdminNotes = notes;
        request.ReviewedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        TriggerAdoSync();

        // Notify User In-App
        try
        {
            await _notifications.CreateNotificationAsync(new Notification
            {
                RecipientEmail = request.UserEmail.ToLowerInvariant(),
                Title = "Access Request Declined",
                Message = $"Your request for {request.RequestedRole} role was declined by admin {adminEmail}. Notes: {notes ?? "None"}",
                Type = NotificationType.AccessRejected,
                ReferenceId = $"rejected_access_{request.Id}",
                SubmissionId = request.Id,
                CreatedAt = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to create in-app notification for access request rejection (Request ID: {RequestId}).", request.Id);
        }

        // Send Email to User (COMMENTED OUT FOR NOW)
        /*
        try
        {
            await _emailService.SendAccessDecisionNotificationAsync(request.UserEmail.ToLowerInvariant(), "DECLINED", request.RequestedRole, notes);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to persist auto-registered role for user in database.");
        }
        */

        return request;
    }

    public async Task<UserRoleAssignment> RevokeAccessAsync(string targetEmail, string adminEmail, string? notes = null)
    {
        if (string.IsNullOrWhiteSpace(targetEmail)) throw new ArgumentException("Target email is required", nameof(targetEmail));
        var norm = targetEmail.Trim().ToLowerInvariant();

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CipDbContext>();

        var assignment = await db.UserRoleAssignments.FirstOrDefaultAsync(a => a.UserEmail.ToLower() == norm);
        if (assignment == null)
        {
            assignment = new UserRoleAssignment
            {
                UserEmail = norm,
                Role = "CONSUMER",
                IsCertifiedReviewer = false,
                GrantedBy = adminEmail,
                Notes = notes,
                GrantedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            db.UserRoleAssignments.Add(assignment);
        }
        else
        {
            assignment.Role = "CONSUMER";
            assignment.IsCertifiedReviewer = false;
            assignment.GrantedBy = adminEmail;
            assignment.Notes = notes;
            assignment.UpdatedAt = DateTime.UtcNow;
        }

        // Also mark any approved requests as Revoked
        var approvedRequests = await db.AccessRequests
            .Where(r => r.UserEmail.ToLower() == norm && r.Status == AccessRequestStatus.Approved)
            .ToListAsync();

        foreach (var req in approvedRequests)
        {
            req.Status = AccessRequestStatus.Revoked;
            req.AdminNotes = notes ?? "Revoked by admin";
            req.ReviewedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync();
        TriggerAdoSync();

        // Notify User In-App
        try
        {
            await _notifications.CreateNotificationAsync(new Notification
            {
                RecipientEmail = norm,
                Title = "Reviewer Access Revoked",
                Message = $"Your reviewer privileges have been revoked by admin {adminEmail}. Your active role is now PRODUCER.",
                Type = NotificationType.AccessRevoked,
                ReferenceId = $"revoked_{Guid.NewGuid():N}",
                CreatedAt = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to create in-app notification for role revocation (User: {UserEmail}).", norm);
        }

        // Send Email to User
        try
        {
            await _emailService.SendAccessDecisionNotificationAsync(norm, "REVOKED", "PRODUCER", notes);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send email notification for role revocation (User: {UserEmail}).", norm);
        }

        return assignment;
    }

    public async Task<UserRoleAssignment> CertifyReviewerAsync(string targetEmail, string adminEmail, string? notes = null)
    {
        if (string.IsNullOrWhiteSpace(targetEmail)) throw new ArgumentException("Target email is required", nameof(targetEmail));
        var norm = targetEmail.Trim().ToLowerInvariant();

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CipDbContext>();

        var assignment = await db.UserRoleAssignments.FirstOrDefaultAsync(a => a.UserEmail.ToLower() == norm);
        if (assignment == null)
        {
            assignment = new UserRoleAssignment
            {
                UserEmail = norm,
                Role = "REVIEWER",
                IsCertifiedReviewer = true,
                GrantedBy = adminEmail,
                Notes = notes,
                GrantedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            db.UserRoleAssignments.Add(assignment);
        }
        else
        {
            assignment.Role = assignment.Role == "ADMIN" ? "ADMIN" : "REVIEWER";
            assignment.IsCertifiedReviewer = true;
            assignment.GrantedBy = adminEmail;
            assignment.Notes = notes;
            assignment.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync();
        TriggerAdoSync();

        // Notify User In-App
        try
        {
            await _notifications.CreateNotificationAsync(new Notification
            {
                RecipientEmail = norm,
                Title = "Congratulations! Certified Reviewer Granted",
                Message = $"You have been granted Certified Reviewer status by admin {adminEmail}.",
                Type = NotificationType.ReviewerCertified,
                ReferenceId = $"certified_reviewer_{Guid.NewGuid():N}",
                CreatedAt = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to create in-app notification for reviewer certification (User: {UserEmail}).", norm);
        }

        return assignment;
    }

    public async Task<IEnumerable<UserRoleAssignment>> GetAllRolesAsync()
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CipDbContext>();

        return await db.UserRoleAssignments
            .OrderBy(u => u.Role == "ADMIN" ? 0 : u.Role == "REVIEWER" ? 1 : u.Role == "CONTRIBUTOR" ? 2 : u.Role == "PRODUCER" ? 3 : 4)
            .ThenBy(u => u.UserEmail)
            .ToListAsync();
    }

    private void TriggerAdoSync()
    {
        _ = Task.Run(async () =>
        {
            try
            {
                await SyncToAzureDevOpsAsync();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Background Azure DevOps governance sync failed.");
            }
        });
    }

    public static string ComputeUserHash(string email, string salt = "")
    {
        if (string.IsNullOrWhiteSpace(email)) return string.Empty;
        var norm = email.Trim().ToLowerInvariant();

        if (!string.IsNullOrEmpty(salt))
        {
            using var hmac = new System.Security.Cryptography.HMACSHA256(System.Text.Encoding.UTF8.GetBytes(salt));
            return Convert.ToHexString(hmac.ComputeHash(System.Text.Encoding.UTF8.GetBytes(norm))).ToLowerInvariant();
        }

        using var sha = System.Security.Cryptography.SHA256.Create();
        return Convert.ToHexString(sha.ComputeHash(System.Text.Encoding.UTF8.GetBytes(norm))).ToLowerInvariant();
    }

    public async Task<bool> SyncToAzureDevOpsAsync()
    {
        if (_httpFactory == null) return false;

        var token = _config["AzureDevOps:Token"] ?? Environment.GetEnvironmentVariable("AZURE_DEVOPS_PAT") ?? Environment.GetEnvironmentVariable("ADO_PAT");
        if (string.IsNullOrWhiteSpace(token))
        {
            _logger.LogDebug("Azure DevOps PAT not configured; governance changes saved to SQLite database.");
            return false;
        }

        var org = _config["AzureDevOps:Organization"] ?? Environment.GetEnvironmentVariable("AZURE_DEVOPS_ORG") ?? "MAQInternalCIP-Engineering-Commons";
        var project = _config["AzureDevOps:Project"] ?? Environment.GetEnvironmentVariable("AZURE_DEVOPS_PROJECT") ?? "Engineering Commons";
        var repo = _config["AzureDevOps:Repository"] ?? Environment.GetEnvironmentVariable("AZURE_DEVOPS_REPO") ?? "Engineering Commons";
        var branch = _config["AzureDevOps:Branch"] ?? "main";

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CipDbContext>();

        var rolesList = await db.UserRoleAssignments.AsNoTracking().OrderBy(r => r.UserEmail).ToListAsync();
        var requestsList = await db.AccessRequests.AsNoTracking().OrderByDescending(r => r.RequestedAt).ToListAsync();
        var salt = _config["Governance:Salt"] ?? Environment.GetEnvironmentVariable("GOVERNANCE_SALT") ?? string.Empty;

        var rolesJson = JsonSerializer.Serialize(new
        {
            updatedAt = DateTime.UtcNow,
            organization = "MAQ Software",
            version = 2,
            hashing = !string.IsNullOrEmpty(salt) ? "HMAC-SHA256" : "SHA-256",
            totalUsers = rolesList.Count,
            userRoles = rolesList.Select(r => new
            {
                userHash = ComputeUserHash(r.UserEmail, salt),
                role = r.Role,
                isCertifiedReviewer = r.IsCertifiedReviewer,
                grantedBy = (!string.IsNullOrEmpty(r.GrantedBy) && r.GrantedBy.Contains('@')) ? ComputeUserHash(r.GrantedBy, salt) : r.GrantedBy,
                notes = r.Notes,
                grantedAt = r.GrantedAt,
                updatedAt = r.UpdatedAt
            })
        }, new JsonSerializerOptions { WriteIndented = true });

        var requestsJson = JsonSerializer.Serialize(new
        {
            updatedAt = DateTime.UtcNow,
            totalRequests = requestsList.Count,
            requests = requestsList.Select(r => new
            {
                id = r.Id,
                userEmail = r.UserEmail,
                requestedRole = r.RequestedRole,
                currentRole = r.CurrentRole,
                status = r.Status.ToString(),
                reason = r.Reason,
                adminEmail = r.AdminEmail,
                adminNotes = r.AdminNotes,
                requestedAt = r.RequestedAt,
                reviewedAt = r.ReviewedAt
            })
        }, new JsonSerializerOptions { WriteIndented = true });

        var client = _httpFactory.CreateClient("azuredevops");
        client.DefaultRequestHeaders.UserAgent.ParseAdd("engineering-commons-governance-sync");
        var authHeaderVal = Convert.ToBase64String(System.Text.Encoding.ASCII.GetBytes($":{token}"));
        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", authHeaderVal);

        var projectPart = !string.IsNullOrEmpty(project) ? $"{project}/" : "";
        var branchName = branch ?? "main";

        string oldObjectId = "0000000000000000000000000000000000000000";
        try
        {
            var refsUrl = $"https://dev.azure.com/{org}/{projectPart}_apis/git/repositories/{repo}/refs?filter=heads/{branchName}&api-version=7.0";
            var refResp = await client.GetAsync(refsUrl);
            if (refResp.IsSuccessStatusCode)
            {
                var refJson = await refResp.Content.ReadAsStringAsync();
                using var refDoc = JsonDocument.Parse(refJson);
                if (refDoc.RootElement.TryGetProperty("value", out var vProp) && vProp.ValueKind == JsonValueKind.Array && vProp.GetArrayLength() > 0)
                {
                    oldObjectId = vProp[0].GetProperty("objectId").GetString() ?? oldObjectId;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to inspect Azure DevOps git ref objectId for branch {Branch}.", branchName);
        }

        // Check if items exist to select edit vs add
        string rolesChangeType = "add";
        string requestsChangeType = "add";
        try
        {
            var itemUrl = $"https://dev.azure.com/{org}/{projectPart}_apis/git/repositories/{repo}/items?path=/governance/user-roles.json&api-version=7.0";
            var itemResp = await client.GetAsync(itemUrl);
            if (itemResp.IsSuccessStatusCode) rolesChangeType = "edit";
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to query Azure DevOps git item for user-roles.json.");
        }

        try
        {
            var itemUrl = $"https://dev.azure.com/{org}/{projectPart}_apis/git/repositories/{repo}/items?path=/governance/access-requests.json&api-version=7.0";
            var itemResp = await client.GetAsync(itemUrl);
            if (itemResp.IsSuccessStatusCode) requestsChangeType = "edit";
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to query Azure DevOps git item for access-requests.json.");
        }

        var pushesUrl = $"https://dev.azure.com/{org}/{projectPart}_apis/git/repositories/{repo}/pushes?api-version=7.0";
        var pushPayload = new
        {
            refUpdates = new[]
            {
                new
                {
                    name = $"refs/heads/{branchName}",
                    oldObjectId = oldObjectId
                }
            },
            commits = new[]
            {
                new
                {
                    comment = $"[Governance Sync] Synchronize user roles & access requests ({DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC)",
                    changes = new object[]
                    {
                        new
                        {
                            changeType = rolesChangeType,
                            item = new { path = "/governance/user-roles.json" },
                            newContent = new { content = rolesJson, contentType = "rawtext" }
                        },
                        new
                        {
                            changeType = requestsChangeType,
                            item = new { path = "/governance/access-requests.json" },
                            newContent = new { content = requestsJson, contentType = "rawtext" }
                        }
                    }
                }
            }
        };

        var pushJson = JsonSerializer.Serialize(pushPayload);
        var req = new HttpRequestMessage(HttpMethod.Post, pushesUrl)
        {
            Content = new StringContent(pushJson, System.Text.Encoding.UTF8, "application/json")
        };

        var pushResp = await client.SendAsync(req);
        if (pushResp.IsSuccessStatusCode)
        {
            _logger.LogInformation("✓ Successfully synchronized user roles & access requests to Azure DevOps Git repository: {Repo}/governance/user-roles.json", repo);
            return true;
        }
        else
        {
            var err = await pushResp.Content.ReadAsStringAsync();
            var sanitizedErr = err.Length > 200 ? err.Substring(0, 200) + "..." : err;
            _logger.LogWarning("Failed to push governance update to Azure DevOps: {StatusCode} {Error}", pushResp.StatusCode, sanitizedErr);
            return false;
        }
    }
}

