using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CipBackend.Services.Interfaces;

namespace CipBackend.Controllers;

[ApiController]
[Route("api/admin/emails")]
public class EmailDiagnosticsController : ControllerBase
{
    private readonly IEmailNotificationService _emailService;
    private readonly IUserRoleService _roleService;

    public EmailDiagnosticsController(IEmailNotificationService emailService, IUserRoleService roleService)
    {
        _emailService = emailService;
        _roleService = roleService;
    }

    [HttpGet("status")]
    public async Task<IActionResult> GetStatus()
    {
        var status = _emailService.GetStatus();
        return Ok(status);
    }

    [HttpGet("outbox")]
    public async Task<IActionResult> GetOutbox([FromQuery] int limit = 20)
    {
        var history = _emailService.GetOutboxHistory(limit);
        return Ok(history);
    }

    public record TestEmailRequest(string? Recipient, string? Subject, string? Body);

    [HttpPost("test")]
    public async Task<IActionResult> SendTestEmail([FromBody] TestEmailRequest? req)
    {
        var recipient = !string.IsNullOrWhiteSpace(req?.Recipient)
            ? req.Recipient.Trim()
            : "harsh.rana@maqsoftware.com";

        var record = await _emailService.SendTestEmailAsync(recipient, req?.Subject, req?.Body);
        return Ok(new
        {
            success = true,
            message = $"Test email notification dispatched to {recipient}",
            deliveryMethod = record.DeliveryMethod,
            graphAttempted = record.GraphAttempted,
            graphSucceeded = record.GraphSucceeded,
            graphError = record.GraphError,
            record
        });
    }

    public record AdminAlertRequest(string AlertType, string Message, string? Details);

    [HttpPost("alert")]
    public async Task<IActionResult> SendAdminAlert([FromBody] AdminAlertRequest req)
    {
        if (string.IsNullOrWhiteSpace(req?.AlertType) || string.IsNullOrWhiteSpace(req?.Message))
        {
            return BadRequest(new { error = "AlertType and Message are required." });
        }

        var sent = await _emailService.SendAdminAlertNotificationAsync(req.AlertType, req.Message, req.Details);
        return Ok(new
        {
            success = sent,
            message = $"Admin alert '{req.AlertType}' dispatched."
        });
    }
}
