using System.Threading.Tasks;

namespace CipBackend.Services.Interfaces;

public record GraphSendResult(
    bool Success,
    int StatusCode,
    string? ErrorMessage,
    string? SenderUsed,
    string? ResponseBody
);

public interface IMicrosoftGraphEmailClient
{
    bool IsConfigured { get; }
    string SenderMailbox { get; }
    string TenantId { get; }
    string ClientId { get; }
    Task<string?> AcquireAccessTokenAsync();
    Task<GraphSendResult> SendMailAsync(string recipientEmail, string subject, string htmlBody, string? plainTextBody = null);
    GraphStatusDto GetStatus();
}
