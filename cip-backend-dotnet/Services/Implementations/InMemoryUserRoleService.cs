using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using EngineeringCommons.Backend.Models;
using EngineeringCommons.Backend.Services.Interfaces;

namespace EngineeringCommons.Backend.Services.Implementations;

public class InMemoryUserRoleService : IUserRoleService
{
    public const string DefaultSuperAdmin = "harsh.rana@maqsoftware.com";

    private readonly ConcurrentDictionary<string, UserRoleAssignment> _roles = new();
    private readonly ConcurrentDictionary<string, UserAccessRequest> _requests = new();
    private readonly INotificationService _notifications;
    private readonly IEmailNotificationService _emailService;
    private readonly IConfiguration _config;
    private readonly ILogger<InMemoryUserRoleService>? _logger;

    public InMemoryUserRoleService(
        INotificationService notifications,
        IEmailNotificationService emailService,
        IConfiguration config,
        ILogger<InMemoryUserRoleService>? logger = null)
    {
        _notifications = notifications;
        _emailService = emailService;
        _config = config;
        _logger = logger;
        SeedDefaults();
    }

    private void SeedDefaults()
    {
        var admins = new[]
        {
            "harsh.rana@maqsoftware.com",
            "admin@company.com",
            "admin@test.com"
        };

        foreach (var admin in admins)
        {
            _roles[admin.ToLowerInvariant()] = new UserRoleAssignment
            {
                UserEmail = admin.ToLowerInvariant(),
                Role = "ADMIN",
                IsCertifiedReviewer = true,
                GrantedBy = "SYSTEM",
                Notes = "System SuperAdmin",
                GrantedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
        }

        var reviewers = new[]
        {
            "reviewer@company.com",
            "reviewer@test.com"
        };

        foreach (var rev in reviewers)
        {
            _roles[rev.ToLowerInvariant()] = new UserRoleAssignment
            {
                UserEmail = rev.ToLowerInvariant(),
                Role = "REVIEWER",
                IsCertifiedReviewer = true,
                GrantedBy = DefaultSuperAdmin,
                Notes = "Certified Enterprise Reviewer",
                GrantedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
        }

        var contributors = new[]
        {
            "producer@company.com",
            "producer@test.com",
            "contributor@company.com",
            "contributor@test.com"
        };

        foreach (var prod in contributors)
        {
            _roles[prod.ToLowerInvariant()] = new UserRoleAssignment
            {
                UserEmail = prod.ToLowerInvariant(),
                Role = "CONTRIBUTOR",
                IsCertifiedReviewer = false,
                GrantedBy = DefaultSuperAdmin,
                Notes = "Pre-approved Contributor",
                GrantedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
        }
    }

    public Task<bool> IsAdminAsync(string email)
    {
        if (string.IsNullOrWhiteSpace(email)) return Task.FromResult(false);
        var norm = email.Trim().ToLowerInvariant();

        if (norm == DefaultSuperAdmin.ToLowerInvariant())
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

        if (_roles.TryGetValue(norm, out var assign) && assign.Role.Equals("ADMIN", StringComparison.OrdinalIgnoreCase))
        {
            return Task.FromResult(true);
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

        if (_roles.TryGetValue(norm, out var assignment) && !string.IsNullOrWhiteSpace(assignment.Role))
        {
            return assignment.Role.ToUpperInvariant();
        }

        var defaultRole = "CONSUMER";
        _roles[norm] = new UserRoleAssignment
        {
            UserEmail = norm,
            Role = defaultRole,
            IsCertifiedReviewer = false,
            GrantedBy = "SYSTEM",
            Notes = "Auto-registered default role",
            GrantedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        return defaultRole;
    }

    public async Task<bool> IsCertifiedReviewerAsync(string email)
    {
        if (string.IsNullOrWhiteSpace(email)) return false;
        var norm = email.Trim().ToLowerInvariant();

        if (await IsAdminAsync(norm)) return true;

        if (_roles.TryGetValue(norm, out var assign))
        {
            return assign.IsCertifiedReviewer || assign.Role.Equals("REVIEWER", StringComparison.OrdinalIgnoreCase);
        }

        return false;
    }

    public async Task<UserAccessRequest> SubmitAccessRequestAsync(string userEmail, string requestedRole, string? reason)
    {
        var norm = (userEmail ?? "").Trim().ToLowerInvariant();
        var currentRole = await ResolveUserRoleAsync(norm);
        var targetRole = string.IsNullOrWhiteSpace(requestedRole) ? "CONTRIBUTOR" : requestedRole.Trim().ToUpperInvariant();

        var req = new UserAccessRequest
        {
            Id = Guid.NewGuid().ToString(),
            UserEmail = norm,
            RequestedRole = targetRole,
            CurrentRole = currentRole,
            Status = AccessRequestStatus.Pending,
            Reason = reason,
            RequestedAt = DateTime.UtcNow
        };

        _requests[req.Id] = req;

        // Notify admins
        await _notifications.CreateNotificationAsync(new Notification
        {
            Id = Guid.NewGuid().ToString(),
            RecipientEmail = DefaultSuperAdmin,
            SubmissionId = req.Id,
            Type = NotificationType.AccessRequested,
            Title = $"Access Request ({targetRole}) from {norm}",
            Message = $"User {norm} requested {targetRole} role. Reason: {reason}",
            CreatedAt = DateTime.UtcNow
        });

        return req;
    }

    public Task<IEnumerable<UserAccessRequest>> GetAccessRequestsAsync(string? status = null)
    {
        var query = _requests.Values.AsEnumerable();
        if (!string.IsNullOrEmpty(status))
        {
            if (Enum.TryParse<AccessRequestStatus>(status, true, out var parsedStatus))
            {
                query = query.Where(r => r.Status == parsedStatus);
            }
        }
        return Task.FromResult<IEnumerable<UserAccessRequest>>(query.OrderByDescending(r => r.RequestedAt).ToList());
    }

    public Task<IEnumerable<UserAccessRequest>> GetUserRequestsAsync(string userEmail)
    {
        var norm = (userEmail ?? "").Trim().ToLowerInvariant();
        var list = _requests.Values
            .Where(r => r.UserEmail == norm)
            .OrderByDescending(r => r.RequestedAt)
            .ToList();
        return Task.FromResult<IEnumerable<UserAccessRequest>>(list);
    }

    public async Task<UserAccessRequest?> ApproveRequestAsync(string requestId, string adminEmail, string? notes = null)
    {
        if (!_requests.TryGetValue(requestId, out var req)) return null;

        req.Status = AccessRequestStatus.Approved;
        req.AdminEmail = adminEmail;
        req.AdminNotes = notes;
        req.ReviewedAt = DateTime.UtcNow;

        _roles[req.UserEmail] = new UserRoleAssignment
        {
            UserEmail = req.UserEmail,
            Role = req.RequestedRole,
            IsCertifiedReviewer = req.RequestedRole == "REVIEWER" || req.RequestedRole == "ADMIN",
            GrantedBy = adminEmail,
            Notes = notes ?? "Approved access request",
            GrantedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _notifications.CreateNotificationAsync(new Notification
        {
            Id = Guid.NewGuid().ToString(),
            RecipientEmail = req.UserEmail,
            SubmissionId = req.Id,
            Type = NotificationType.AccessApproved,
            Title = "Access Request Approved",
            Message = $"Your request for {req.RequestedRole} role has been approved by admin {adminEmail}.",
            CreatedAt = DateTime.UtcNow
        });

        return req;
    }

    public async Task<UserAccessRequest?> RejectRequestAsync(string requestId, string adminEmail, string? notes = null)
    {
        if (!_requests.TryGetValue(requestId, out var req)) return null;

        req.Status = AccessRequestStatus.Rejected;
        req.AdminEmail = adminEmail;
        req.AdminNotes = notes;
        req.ReviewedAt = DateTime.UtcNow;

        await _notifications.CreateNotificationAsync(new Notification
        {
            Id = Guid.NewGuid().ToString(),
            RecipientEmail = req.UserEmail,
            SubmissionId = req.Id,
            Type = NotificationType.AccessRejected,
            Title = "Access Request Rejected",
            Message = $"Your request for {req.RequestedRole} role was rejected. Notes: {notes ?? "None"}",
            CreatedAt = DateTime.UtcNow
        });

        return req;
    }

    public Task<UserRoleAssignment> RevokeAccessAsync(string targetEmail, string adminEmail, string? notes = null)
    {
        var norm = (targetEmail ?? "").Trim().ToLowerInvariant();
        var assignment = new UserRoleAssignment
        {
            UserEmail = norm,
            Role = "CONSUMER",
            IsCertifiedReviewer = false,
            GrantedBy = adminEmail,
            Notes = notes ?? "Access revoked",
            GrantedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _roles[norm] = assignment;
        return Task.FromResult(assignment);
    }

    public Task<UserRoleAssignment> CertifyReviewerAsync(string targetEmail, string adminEmail, string? notes = null)
    {
        var norm = (targetEmail ?? "").Trim().ToLowerInvariant();
        var assignment = new UserRoleAssignment
        {
            UserEmail = norm,
            Role = "REVIEWER",
            IsCertifiedReviewer = true,
            GrantedBy = adminEmail,
            Notes = notes ?? "Certified reviewer",
            GrantedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _roles[norm] = assignment;
        return Task.FromResult(assignment);
    }

    public Task<IEnumerable<UserRoleAssignment>> GetAllRolesAsync()
    {
        return Task.FromResult<IEnumerable<UserRoleAssignment>>(_roles.Values.ToList());
    }

    public Task<bool> SyncToAzureDevOpsAsync()
    {
        return Task.FromResult(true);
    }
}
