using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace EngineeringCommons.Backend.Services.Interfaces;

public record DispatchedEmailRecord(
    string Id,
    string Recipient,
    string Subject,
    string Body,
    string DeliveryMethod, // "MicrosoftGraph", "NetworkSmtp", or "PickupDirectory"
    bool SmtpAttempted,
    bool SmtpSucceeded,
    string? SmtpError,
    string? EmlFilePath,
    DateTime Timestamp,
    bool GraphAttempted = false,
    bool GraphSucceeded = false,
    string? GraphError = null,
    string? GraphSender = null,
    string? HtmlBody = null
);

public record GraphStatusDto(
    bool Enabled,
    bool HasClientSecret,
    string TenantId,
    string ClientId,
    string SenderMailbox,
    string? FallbackSenderMailbox,
    bool TokenAcquired,
    string? TokenStatus
);

public record SmtpStatusDto(
    bool IsConfigured,
    string? Host,
    int Port,
    bool EnableSsl,
    string FromEmail,
    string DeliveryMode,
    string PickupDirectoryPath,
    int TotalDispatchedCount,
    string AdminEmail
);

public record EmailServiceStatusDto(
    bool IsConfigured,
    string DeliveryMode,
    string ActiveSender,
    string AdminEmail,
    string PickupDirectoryPath,
    int TotalDispatchedCount,
    GraphStatusDto Graph,
    SmtpStatusDto Smtp
);

public interface IEmailNotificationService
{
    // 1. Reviewer access request submitted
    Task<bool> SendAccessRequestNotificationAsync(string adminEmail, string userEmail, string requestedRole, string requestId, string? reason = null);

    // 2. Reviewer request approved / rejected
    Task<bool> SendAccessDecisionNotificationAsync(string userEmail, string decision, string role, string? notes);

    // 3. New bounty assigned / claimed
    Task<bool> SendBountyAssignedNotificationAsync(string bountyTitle, string recipientEmail, int credits, string bountyId, int dueInDays);

    // 4. Bounty issue reported
    Task<bool> SendBountyIssueReportedNotificationAsync(string bountyTitle, string reporterEmail, string issueDescription, string severity, string bountyId);

    // 5. Bounty resolved
    Task<bool> SendBountyResolvedNotificationAsync(string bountyTitle, string resolverEmail, int credits, string bountyId);

    // 6. Artifact certified
    Task<bool> SendArtifactCertifiedNotificationAsync(string artifactId, string version, string producerEmail, string certifiedBy, string? badge);

    // 7. Artifact certification rejected / revoked
    Task<bool> SendArtifactCertificationRejectedNotificationAsync(string artifactId, string producerEmail, string reason, string rejectedBy);

    // 8. Marketplace artifact published
    Task<bool> SendArtifactPublishedNotificationAsync(string artifactName, string version, string producerEmail, string approvedBy);

    // 9. Important admin notifications
    Task<bool> SendAdminAlertNotificationAsync(string alertType, string message, string? details);

    // General diagnostic & outbox methods
    Task<DispatchedEmailRecord> SendTestEmailAsync(string toEmail, string? customSubject = null, string? customBody = null);
    EmailServiceStatusDto GetStatus();
    SmtpStatusDto GetSmtpStatus();
    IEnumerable<DispatchedEmailRecord> GetOutboxHistory(int limit = 20);
}
