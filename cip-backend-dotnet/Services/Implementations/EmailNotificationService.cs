using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Mail;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using EngineeringCommons.Backend.Services.Interfaces;

namespace EngineeringCommons.Backend.Services.Implementations;

public class EmailNotificationService : IEmailNotificationService
{
    private readonly IConfiguration _config;
    private readonly ILogger<EmailNotificationService> _logger;
    private readonly IMicrosoftGraphEmailClient _graphClient;
    private readonly ConcurrentBag<DispatchedEmailRecord> _outbox = new();
    private readonly string _pickupDirectory;

    public EmailNotificationService(
        IConfiguration config,
        ILogger<EmailNotificationService> logger,
        IMicrosoftGraphEmailClient graphClient)
    {
        _config = config;
        _logger = logger;
        _graphClient = graphClient;

        var configuredDir = _config["Smtp:PickupDirectory"] ?? Environment.GetEnvironmentVariable("SMTP_PICKUP_DIR") ?? "mail_outbox";
        _pickupDirectory = Path.GetFullPath(configuredDir);

        try
        {
            if (!Directory.Exists(_pickupDirectory))
            {
                Directory.CreateDirectory(_pickupDirectory);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not initialize pickup directory at {Path}", _pickupDirectory);
        }
    }

    // 1. Reviewer access request submitted
    public async Task<bool> SendAccessRequestNotificationAsync(string adminEmail, string userEmail, string requestedRole, string requestId, string? reason = null)
    {
        var subject = $"[Engineering Commons] Action Required: Access Request for {requestedRole} from {userEmail}";
        var details = new Dictionary<string, string>
        {
            ["Applicant"] = userEmail,
            ["Requested Role"] = requestedRole,
            ["Request ID"] = requestId,
            ["Reason"] = reason ?? "None provided",
            ["Submitted At"] = $"{DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC"
        };

        var actions = $@"
          <div style=""margin-top: 20px; padding: 15px; background: #eef2ff; border-left: 4px solid #4f46e5; border-radius: 4px;"">
            <p style=""margin: 0 0 10px 0; font-weight: bold; color: #1e1b4b;"">Quick Admin Approval via CLI:</p>
            <code style=""display: block; background: #1e293b; color: #f8fafc; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 13px;"">
              engineering-commons approve-access {requestId}
            </code>
            <p style=""margin: 10px 0 0 0; font-size: 13px; color: #475569;"">
              Or review in VS Code: <strong>Engineering Commons Explorer &rarr; Admin Access Governance</strong>.
            </p>
          </div>";

        var plainText = $@"Hello Admin,

A user has requested elevated role access in Engineering Commons:

  User:           {userEmail}
  Requested Role: {requestedRole}
  Request ID:     {requestId}
  Reason:         {reason ?? "None provided"}
  Timestamp:      {DateTime.UtcNow:u}

To approve via CLI:
  engineering-commons approve-access {requestId}

Or reject:
  engineering-commons reject-access {requestId}

Best regards,
Engineering Commons Notification System";

        var html = BuildCorporateEmailHtml(
            title: "Elevated Access Request",
            badgeText: "ACTION REQUIRED",
            badgeColor: "#f59e0b",
            introMessage: "A team member has requested elevated permissions in Engineering Commons. Please review the details below:",
            fields: details,
            actionContentHtml: actions
        );

        var record = await DispatchEmailAsync(adminEmail, subject, plainText, html);
        return record.GraphSucceeded || record.SmtpSucceeded || record.EmlFilePath != null;
    }

    // 2. Reviewer request approved / rejected
    public async Task<bool> SendAccessDecisionNotificationAsync(string userEmail, string decision, string role, string? notes)
    {
        bool isApproved = string.Equals(decision, "APPROVED", StringComparison.OrdinalIgnoreCase);
        var subject = $"[Engineering Commons] Your Access Request for {role} has been {(isApproved ? "Approved" : "Rejected")}";
        
        var details = new Dictionary<string, string>
        {
            ["Decision"] = isApproved ? "APPROVED ✓" : "REJECTED ✕",
            ["Role"] = role,
            ["Admin Notes"] = notes ?? (isApproved ? "Access granted." : "No specific notes provided."),
            ["Updated At"] = $"{DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC"
        };

        var actions = isApproved ? $@"
          <div style=""margin-top: 20px; padding: 15px; background: #ecfdf5; border-left: 4px solid #10b981; border-radius: 4px;"">
            <p style=""margin: 0 0 8px 0; font-weight: bold; color: #065f46;"">Next Steps:</p>
            <p style=""margin: 0; font-size: 13px; color: #047857;"">
              Your session permissions are ready. Run <code style=""background: #e2e8f0; padding: 2px 5px; border-radius: 3px;"">engineering-commons login</code> or re-open VS Code to start reviewing!
            </p>
          </div>" : "";

        var plainText = $@"Hello,

Your access request for role '{role}' in Engineering Commons has been {decision.ToLowerInvariant()}.

Admin Notes: {notes ?? "None"}

Please sign in to Engineering Commons to refresh your permissions:
  engineering-commons login

Best regards,
Engineering Commons Administration";

        var html = BuildCorporateEmailHtml(
            title: $"Access Request {decision.ToUpperInvariant()}",
            badgeText: isApproved ? "APPROVED" : "REJECTED",
            badgeColor: isApproved ? "#10b981" : "#ef4444",
            introMessage: $"Your access request for the {role} role has been processed by an administrator.",
            fields: details,
            actionContentHtml: actions
        );

        var record = await DispatchEmailAsync(userEmail, subject, plainText, html);
        return record.GraphSucceeded || record.SmtpSucceeded || record.EmlFilePath != null;
    }

    // 3. New bounty assigned / claimed
    public async Task<bool> SendBountyAssignedNotificationAsync(string bountyTitle, string recipientEmail, int credits, string bountyId, int dueInDays)
    {
        var subject = $"[Engineering Commons] Bounty Claimed: {bountyTitle} (+{credits} Credits)";
        var details = new Dictionary<string, string>
        {
            ["Bounty Title"] = bountyTitle,
            ["Bounty ID"] = bountyId,
            ["Reward"] = $"{credits} Credits",
            ["Claimed By"] = recipientEmail,
            ["Estimated Due"] = $"In {dueInDays} days",
            ["Auto-Release"] = "18 hours of inactivity"
        };

        var actions = $@"
          <div style=""margin-top: 20px; padding: 15px; background: #f0fdf4; border-left: 4px solid #22c55e; border-radius: 4px;"">
            <p style=""margin: 0 0 8px 0; font-weight: bold; color: #15803d;"">Work in Progress:</p>
            <p style=""margin: 0; font-size: 13px; color: #166534;"">
              Open your <strong>Engineering Commons Explorer &rarr; My Work</strong> view in VS Code to complete this bounty.
            </p>
          </div>";

        var plainText = $@"Hello,

You have successfully claimed the bounty '{bountyTitle}'.

Details:
  Bounty ID: {bountyId}
  Reward:    {credits} Credits
  Due In:    {dueInDays} days

Open VS Code CIP Explorer to view and complete your task.

Best regards,
Engineering Commons System";

        var html = BuildCorporateEmailHtml(
            title: "Bounty Assigned & Claimed",
            badgeText: $"+{credits} CREDITS",
            badgeColor: "#10b981",
            introMessage: "You have claimed a task on Engineering Commons Bounty Board. Happy coding!",
            fields: details,
            actionContentHtml: actions
        );

        var record = await DispatchEmailAsync(recipientEmail, subject, plainText, html);
        return record.GraphSucceeded || record.SmtpSucceeded || record.EmlFilePath != null;
    }

    // 4. Bounty issue reported
    public async Task<bool> SendBountyIssueReportedNotificationAsync(string bountyTitle, string reporterEmail, string issueDescription, string severity, string bountyId)
    {
        var adminEmail = _config["AdminEmail"] ?? "admin@maqsoftware.com";
        var subject = $"[Engineering Commons] Issue Reported on Bounty: {bountyTitle} [{severity.ToUpperInvariant()}]";

        var details = new Dictionary<string, string>
        {
            ["Bounty"] = bountyTitle,
            ["Bounty ID"] = bountyId,
            ["Reported By"] = reporterEmail,
            ["Severity"] = severity.ToUpperInvariant(),
            ["Issue Description"] = issueDescription,
            ["Reported At"] = $"{DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC"
        };

        var plainText = $@"Hello Admin,

An issue was reported on bounty '{bountyTitle}' (ID: {bountyId}):

  Reporter:    {reporterEmail}
  Severity:    {severity}
  Description: {issueDescription}
  Timestamp:   {DateTime.UtcNow:u}

Best regards,
Engineering Commons System";

        var html = BuildCorporateEmailHtml(
            title: "Bounty Issue Reported",
            badgeText: severity.ToUpperInvariant(),
            badgeColor: "#ef4444",
            introMessage: "A developer encountered a blocker or issue with an active bounty task.",
            fields: details
        );

        var record = await DispatchEmailAsync(adminEmail, subject, plainText, html);
        return record.GraphSucceeded || record.SmtpSucceeded || record.EmlFilePath != null;
    }

    // 5. Bounty resolved
    public async Task<bool> SendBountyResolvedNotificationAsync(string bountyTitle, string resolverEmail, int credits, string bountyId)
    {
        var subject = $"[Engineering Commons] Congratulations! Bounty Completed: {bountyTitle}";
        var details = new Dictionary<string, string>
        {
            ["Bounty"] = bountyTitle,
            ["Bounty ID"] = bountyId,
            ["Completed By"] = resolverEmail,
            ["Credits Awarded"] = $"+{credits} Credits",
            ["Status"] = "Resolved / Completed ✓",
            ["Resolved At"] = $"{DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC"
        };

        var plainText = $@"Hello,

Congratulations! The bounty '{bountyTitle}' has been successfully completed and resolved.

Reward: {credits} Credits have been credited to {resolverEmail}.

Best regards,
Engineering Commons System";

        var html = BuildCorporateEmailHtml(
            title: "Bounty Successfully Resolved",
            badgeText: "COMPLETED",
            badgeColor: "#10b981",
            introMessage: "Your contribution has been verified and the bounty is marked as resolved!",
            fields: details
        );

        var record = await DispatchEmailAsync(resolverEmail, subject, plainText, html);
        return record.GraphSucceeded || record.SmtpSucceeded || record.EmlFilePath != null;
    }

    // 6. Artifact certified
    public async Task<bool> SendArtifactCertifiedNotificationAsync(string artifactId, string version, string producerEmail, string certifiedBy, string? badge)
    {
        var subject = $"[Engineering Commons] Verified Certification Granted: {artifactId} v{version}";
        var details = new Dictionary<string, string>
        {
            ["Artifact"] = artifactId,
            ["Certified Version"] = version,
            ["Producer"] = producerEmail,
            ["Certified By"] = certifiedBy,
            ["Certification Tier"] = badge ?? "Verified Enterprise",
            ["Certified At"] = $"{DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC"
        };

        var actions = @"
          <div style=""margin-top: 20px; padding: 15px; background: #f0fdfa; border-left: 4px solid #0d9488; border-radius: 4px;"">
            <p style=""margin: 0 0 8px 0; font-weight: bold; color: #115e59;"">Marketplace Visibility:</p>
            <p style=""margin: 0; font-size: 13px; color: #134e4a;"">
              Your artifact now features the verified <strong>Certified Reviewer Badge</strong> in the internal CIP Marketplace.
            </p>
          </div>";

        var plainText = $@"Hello,

Your artifact '{artifactId}' (version {version}) has been officially certified by {certifiedBy}!

Certification Tier: {badge ?? "Verified Enterprise"}
Certified At: {DateTime.UtcNow:u}

Best regards,
Engineering Commons Quality & Governance Team";

        var html = BuildCorporateEmailHtml(
            title: "Artifact Officially Certified",
            badgeText: "CERTIFIED ✓",
            badgeColor: "#059669",
            introMessage: "Your package meets all enterprise quality, testing, and security standards.",
            fields: details,
            actionContentHtml: actions
        );

        var record = await DispatchEmailAsync(producerEmail, subject, plainText, html);
        return record.GraphSucceeded || record.SmtpSucceeded || record.EmlFilePath != null;
    }

    // 7. Artifact certification rejected / revoked
    public async Task<bool> SendArtifactCertificationRejectedNotificationAsync(string artifactId, string producerEmail, string reason, string rejectedBy)
    {
        var subject = $"[Engineering Commons] Certification Update for {artifactId}: Action Needed";
        var details = new Dictionary<string, string>
        {
            ["Artifact"] = artifactId,
            ["Reviewed By"] = rejectedBy,
            ["Status"] = "Certification Revoked / Rejected",
            ["Reason / Feedback"] = reason,
            ["Timestamp"] = $"{DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC"
        };

        var actions = @"
          <div style=""margin-top: 20px; padding: 15px; background: #fff1f2; border-left: 4px solid #e11d48; border-radius: 4px;"">
            <p style=""margin: 0 0 8px 0; font-weight: bold; color: #9f1239;"">Recommended Action:</p>
            <p style=""margin: 0; font-size: 13px; color: #881337;"">
              Review feedback in VS Code CIP Diff Viewer, update test coverage or security criteria, and resubmit for evaluation.
            </p>
          </div>";

        var plainText = $@"Hello,

Certification for artifact '{artifactId}' was not granted or has been revoked by {rejectedBy}.

Reason: {reason}

Please review the feedback and resubmit once criteria are met.

Best regards,
Engineering Commons Governance Team";

        var html = BuildCorporateEmailHtml(
            title: "Certification Update",
            badgeText: "ACTION NEEDED",
            badgeColor: "#e11d48",
            introMessage: "Certification criteria were not satisfied for your artifact.",
            fields: details,
            actionContentHtml: actions
        );

        var record = await DispatchEmailAsync(producerEmail, subject, plainText, html);
        return record.GraphSucceeded || record.SmtpSucceeded || record.EmlFilePath != null;
    }

    // 8. Marketplace artifact published
    public async Task<bool> SendArtifactPublishedNotificationAsync(string artifactName, string version, string producerEmail, string approvedBy)
    {
        var subject = $"[Engineering Commons] Published to Marketplace: {artifactName} v{version}";
        var details = new Dictionary<string, string>
        {
            ["Artifact"] = artifactName,
            ["Version"] = version,
            ["Producer"] = producerEmail,
            ["Approved By"] = approvedBy,
            ["Status"] = "Available in Marketplace ✓",
            ["Published At"] = $"{DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC"
        };

        var actions = $@"
          <div style=""margin-top: 20px; padding: 15px; background: #eff6ff; border-left: 4px solid #2563eb; border-radius: 4px;"">
            <p style=""margin: 0 0 8px 0; font-weight: bold; color: #1e40af;"">Available to Organization:</p>
            <p style=""margin: 0; font-size: 13px; color: #1e3a8a;"">
              Consumers can install your package immediately via CLI:
              <code style=""display: block; background: #1e293b; color: #f8fafc; padding: 8px; border-radius: 4px; margin-top: 6px; font-family: monospace;"">
                engineering-commons install {artifactName}
              </code>
            </p>
          </div>";

        var plainText = $@"Hello,

Great news! Your artifact '{artifactName}' v{version} has been approved by {approvedBy} and is now published to the Engineering Commons Marketplace!

Best regards,
Engineering Commons System";

        var html = BuildCorporateEmailHtml(
            title: "Artifact Published to Marketplace",
            badgeText: "PUBLISHED",
            badgeColor: "#2563eb",
            introMessage: "Your reviewed submission is now live and consumable by the company engineering organization.",
            fields: details,
            actionContentHtml: actions
        );

        var record = await DispatchEmailAsync(producerEmail, subject, plainText, html);
        return record.GraphSucceeded || record.SmtpSucceeded || record.EmlFilePath != null;
    }

    // 9. Important admin notifications
    public async Task<bool> SendAdminAlertNotificationAsync(string alertType, string message, string? details)
    {
        var adminEmail = _config["AdminEmail"] ?? "admin@maqsoftware.com";
        var subject = $"[Engineering Commons Admin Alert] {alertType}";

        var fields = new Dictionary<string, string>
        {
            ["Alert Type"] = alertType,
            ["Timestamp"] = $"{DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC",
            ["Message"] = message
        };

        if (!string.IsNullOrWhiteSpace(details))
        {
            fields["Details"] = details;
        }

        var plainText = $@"Hello Admin,

Engineering Commons Alert: {alertType}

Message:
{message}

Details:
{details ?? "None"}

Best regards,
Engineering Commons System";

        var html = BuildCorporateEmailHtml(
            title: $"System Alert: {alertType}",
            badgeText: "ADMIN ALERT",
            badgeColor: "#dc2626",
            introMessage: "An important operational notification has been triggered by Engineering Commons.",
            fields: fields
        );

        var record = await DispatchEmailAsync(adminEmail, subject, plainText, html);
        return record.GraphSucceeded || record.SmtpSucceeded || record.EmlFilePath != null;
    }

    public async Task<DispatchedEmailRecord> SendTestEmailAsync(string toEmail, string? customSubject = null, string? customBody = null)
    {
        var smtpStatus = GetSmtpStatus();
        var subject = customSubject ?? $"[Engineering Commons] Test Email Notification ({DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC)";
        var plainBody = customBody ?? $@"Hello,

This is a test notification confirming that email notifications for Engineering Commons are active and operational.

System Details:
  Delivery:   {(smtpStatus.IsConfigured ? $"SMTP Live ({smtpStatus.Host}:{smtpStatus.Port})" : "Pickup Directory Mode (Local Outbox)")}
  Sender:     {smtpStatus.FromEmail}
  Recipient:  {toEmail}
  Generated:  {DateTime.UtcNow:u}

Best regards,
Engineering Commons System";

        var fields = new Dictionary<string, string>
        {
            ["Recipient"] = toEmail,
            ["Delivery Backend"] = smtpStatus.IsConfigured ? $"SMTP Live ({smtpStatus.Host}:{smtpStatus.Port})" : "Pickup Directory (Local Outbox)",
            ["Sender"] = smtpStatus.FromEmail,
            ["Timestamp"] = $"{DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC"
        };

        var htmlBody = BuildCorporateEmailHtml(
            title: "Test Email Verification",
            badgeText: "DIAGNOSTIC TEST",
            badgeColor: "#0284c7",
            introMessage: "This notification confirms that the email notification pipeline for Engineering Commons is operational.",
            fields: fields
        );

        return await DispatchEmailAsync(toEmail, subject, plainBody, htmlBody);
    }

    public EmailServiceStatusDto GetStatus()
    {
        var smtpStatus = GetSmtpStatus();
        var graphStatus = _graphClient.GetStatus();

        string deliveryMode = "Disabled (Commented Out)";
        string activeSender = smtpStatus.FromEmail;

        return new EmailServiceStatusDto(
            IsConfigured: false,
            DeliveryMode: deliveryMode,
            ActiveSender: activeSender,
            AdminEmail: smtpStatus.AdminEmail,
            PickupDirectoryPath: string.IsNullOrEmpty(_pickupDirectory) ? "mail_outbox" : Path.GetFileName(_pickupDirectory.TrimEnd('\\', '/')),
            TotalDispatchedCount: _outbox.Count,
            Graph: graphStatus,
            Smtp: smtpStatus
        );
    }

    public SmtpStatusDto GetSmtpStatus()
    {
        var host = !string.IsNullOrWhiteSpace(_config["Smtp:Host"]) 
            ? _config["Smtp:Host"] 
            : (Environment.GetEnvironmentVariable("SMTP_HOST") ?? "smtp.gmail.com");
        var portStr = _config["Smtp:Port"] ?? Environment.GetEnvironmentVariable("SMTP_PORT");
        int port = int.TryParse(portStr, out var p) ? p : 587;
        var sslStr = _config["Smtp:EnableSsl"] ?? Environment.GetEnvironmentVariable("SMTP_ENABLE_SSL");
        bool enableSsl = !bool.TryParse(sslStr, out var ssl) || ssl;
        var username = _config["Smtp:Username"] ?? Environment.GetEnvironmentVariable("SMTP_USERNAME");
        var password = _config["Smtp:Password"] ?? Environment.GetEnvironmentVariable("SMTP_PASSWORD");
        var fromEmail = _config["Smtp:FromEmail"] ?? Environment.GetEnvironmentVariable("SMTP_FROM");
        if (string.IsNullOrWhiteSpace(fromEmail))
        {
            fromEmail = !string.IsNullOrWhiteSpace(username) ? username : "notifications@engineering-commons.internal";
        }
        var adminEmail = _config["AdminEmail"] ?? "admin@maqsoftware.com";

        bool isConfigured = !string.IsNullOrWhiteSpace(host) && !string.IsNullOrWhiteSpace(username) && !string.IsNullOrWhiteSpace(password);
        string mode = isConfigured 
            ? (host?.Contains("gmail", StringComparison.OrdinalIgnoreCase) == true ? "Gmail SMTP (Live Delivery)" : "Network SMTP (Live Delivery)")
            : "PickupOutbox (Local EML - SMTP Credentials Needed)";

        return new SmtpStatusDto(
            IsConfigured: isConfigured,
            Host: string.IsNullOrWhiteSpace(host) ? null : host,
            Port: port,
            EnableSsl: enableSsl,
            FromEmail: fromEmail,
            DeliveryMode: mode,
            PickupDirectoryPath: _pickupDirectory,
            TotalDispatchedCount: _outbox.Count,
            AdminEmail: adminEmail
        );
    }

    public IEnumerable<DispatchedEmailRecord> GetOutboxHistory(int limit = 20)
    {
        return _outbox.OrderByDescending(r => r.Timestamp).Take(limit).ToList();
    }

    private Task<DispatchedEmailRecord> DispatchEmailAsync(string toEmail, string subject, string plainTextBody, string? htmlBody = null)
    {
        var emailId = Guid.NewGuid().ToString();

        // =========================================================================
        // ALL EMAIL NOTIFICATIONS CURRENTLY COMMENTED OUT AS REQUESTED
        // =========================================================================
        /*
        var fromEmail = _graphClient.SenderMailbox;

        htmlBody ??= BuildCorporateEmailHtml(subject, "NOTIFICATION", "#004B87", plainTextBody, new Dictionary<string, string>
        {
            ["Recipient"] = toEmail,
            ["Date"] = $"{DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC"
        });

        // 1. EML pickup directory writing
        string? emlPath = null;
        try
        {
            if (!Directory.Exists(_pickupDirectory))
            {
                Directory.CreateDirectory(_pickupDirectory);
            }

            var safeRecipient = System.Text.RegularExpressions.Regex.Replace(toEmail ?? string.Empty, @"[^a-zA-Z0-9_\-]", "_");
            var cleanSubject = (subject ?? string.Empty).Replace("\r", "").Replace("\n", " ").Trim();
            var filename = $"{DateTime.UtcNow:yyyyMMdd_HHmmss}_{safeRecipient}_{emailId.Substring(0, 8)}.eml";
            emlPath = Path.Combine(_pickupDirectory, filename);

            var emlBuilder = new StringBuilder();
            emlBuilder.AppendLine($"X-Unsent: 1");
            emlBuilder.AppendLine($"Date: {DateTime.UtcNow:R}");
            emlBuilder.AppendLine($"From: Engineering Commons <{fromEmail}>");
            emlBuilder.AppendLine($"To: <{toEmail}>");
            emlBuilder.AppendLine($"Subject: {cleanSubject}");
            emlBuilder.AppendLine($"MIME-Version: 1.0");
            emlBuilder.AppendLine($"Content-Type: text/html; charset=utf-8");
            emlBuilder.AppendLine($"Content-Transfer-Encoding: 8bit");
            emlBuilder.AppendLine();
            emlBuilder.AppendLine(htmlBody);

            File.WriteAllText(emlPath, emlBuilder.ToString(), Encoding.UTF8);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[EmailNotification] Failed to write EML message for {Recipient}", toEmail);
        }

        // 2. Microsoft Graph Mail.Send
        if (_graphClient.IsConfigured)
        {
            await _graphClient.SendMailAsync(toEmail, subject, htmlBody, plainTextBody);
        }

        // 3. SMTP
        var smtpHost = !string.IsNullOrWhiteSpace(_config["Smtp:Host"]) ? _config["Smtp:Host"] : "smtp.gmail.com";
        using var client = new SmtpClient(smtpHost, 587) { EnableSsl = true };
        client.Send(new MailMessage(fromEmail, toEmail, subject, htmlBody) { IsBodyHtml = true });
        */

        _logger.LogInformation("[EmailNotification] Email notifications are temporarily commented out/disabled. Skipped dispatch for {Recipient} (Subject: {Subject})", toEmail, subject);

        var record = new DispatchedEmailRecord(
            Id: emailId,
            Recipient: toEmail,
            Subject: subject,
            Body: plainTextBody,
            DeliveryMethod: "Disabled (Commented Out)",
            SmtpAttempted: false,
            SmtpSucceeded: false,
            SmtpError: "Email notifications are temporarily commented out.",
            EmlFilePath: null,
            Timestamp: DateTime.UtcNow,
            GraphAttempted: false,
            GraphSucceeded: false,
            GraphError: null,
            GraphSender: null,
            HtmlBody: htmlBody
        );

        _outbox.Add(record);
        return Task.FromResult(record);
    }

    private string BuildCorporateEmailHtml(
        string title,
        string badgeText,
        string badgeColor,
        string introMessage,
        Dictionary<string, string> fields,
        string? actionContentHtml = null)
    {
        var rows = new StringBuilder();
        foreach (var (k, v) in fields)
        {
            rows.Append($@"
              <tr>
                <td style=""padding: 10px 12px; font-weight: 600; color: #475569; width: 35%; border-bottom: 1px solid #e2e8f0; font-size: 13px;"">{WebUtility.HtmlEncode(k)}</td>
                <td style=""padding: 10px 12px; color: #1e293b; border-bottom: 1px solid #e2e8f0; font-size: 13px;"">{WebUtility.HtmlEncode(v)}</td>
              </tr>");
        }

        return $@"<!DOCTYPE html>
<html lang=""en"">
<head>
  <meta charset=""utf-8"">
  <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
  <title>{WebUtility.HtmlEncode(title)}</title>
</head>
<body style=""margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;"">
  <table width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""background-color: #f1f5f9; padding: 30px 15px;"">
    <tr>
      <td align=""center"">
        <table width=""600"" cellpadding=""0"" cellspacing=""0"" style=""max-width: 600px; width: 100%; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);"">
          <!-- Corporate Header -->
          <tr>
            <td style=""background: linear-gradient(135deg, #004B87 0%, #002D62 100%); padding: 24px 30px; text-align: left;"">
              <table width=""100%"" cellpadding=""0"" cellspacing=""0"">
                <tr>
                  <td>
                    <span style=""color: #38bdf8; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;"">MAQ Software &bull; Engineering Commons</span>
                    <h1 style=""margin: 6px 0 0 0; color: #ffffff; font-size: 20px; font-weight: 600;"">{WebUtility.HtmlEncode(title)}</h1>
                  </td>
                  <td align=""right"" style=""vertical-align: middle;"">
                    <span style=""background: {badgeColor}; color: #ffffff; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px;"">{WebUtility.HtmlEncode(badgeText)}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style=""padding: 30px;"">
              <p style=""margin: 0 0 20px 0; font-size: 15px; line-height: 1.5; color: #334155;"">
                {WebUtility.HtmlEncode(introMessage)}
              </p>
              <!-- Details Table -->
              <table width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""border-collapse: collapse; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;"">
                {rows}
              </table>
              {actionContentHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style=""background: #f8fafc; padding: 18px 30px; border-top: 1px solid #e2e8f0; text-align: center;"">
              <p style=""margin: 0; font-size: 12px; color: #64748b;"">
                Dispatched automatically via <strong>Engineering Commons Notification System (SMTP)</strong>
              </p>
              <p style=""margin: 4px 0 0 0; font-size: 11px; color: #94a3b8;"">
                Mode: <code>{WebUtility.HtmlEncode(GetStatus().DeliveryMode)}</code> &bull; Sender: <code>{WebUtility.HtmlEncode(GetStatus().ActiveSender)}</code>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>";
    }
}
