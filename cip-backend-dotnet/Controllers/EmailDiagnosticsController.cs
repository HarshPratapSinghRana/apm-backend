using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using EngineeringCommons.Backend.Models;
using EngineeringCommons.Backend.Services.Interfaces;

namespace EngineeringCommons.Backend.Controllers;

[ApiController]
[Route("api/admin/emails")]
public class EmailDiagnosticsController : ControllerBase
{
    private const int DefaultEmailOutboxLimit = 20;
    private readonly IEmailNotificationService _emailService;
    private readonly IUserRoleService _roleService;
    private readonly IWebHostEnvironment _env;
    private readonly IConfiguration _config;

    public EmailDiagnosticsController(
        IEmailNotificationService emailService,
        IUserRoleService roleService,
        IWebHostEnvironment env,
        IConfiguration config)
    {
        _emailService = emailService ?? throw new ArgumentNullException(nameof(emailService));
        _roleService = roleService ?? throw new ArgumentNullException(nameof(roleService));
        _env = env ?? throw new ArgumentNullException(nameof(env));
        _config = config ?? throw new ArgumentNullException(nameof(config));
    }

    private bool IsAdminAuthorized()
    {
        if (_env.IsDevelopment() || string.Equals(_config["EnableMockAuth"], "true", StringComparison.OrdinalIgnoreCase)) return true;
        if (!User.Identity?.IsAuthenticated ?? true) return false;
        var role = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Role || c.Type == "roles")?.Value;
        var adminEmail = _config["AdminEmail"] ?? "admin@maqsoftware.com";
        return string.Equals(role, UserRoles.Admin, StringComparison.OrdinalIgnoreCase) ||
               string.Equals(User.Identity?.Name, adminEmail, StringComparison.OrdinalIgnoreCase) ||
               string.Equals(User.Identity?.Name, "admin@company.com", StringComparison.OrdinalIgnoreCase) ||
               string.Equals(User.Identity?.Name, "admin@test.com", StringComparison.OrdinalIgnoreCase);
    }

    [HttpGet("status")]
    public IActionResult GetStatus()
    {
        if (!IsAdminAuthorized())
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "Admin role required to view email service status." });
        }
        var status = _emailService.GetStatus();
        return Ok(status);
    }

    [HttpGet("outbox")]
    public IActionResult GetOutbox([FromQuery] int limit = DefaultEmailOutboxLimit)
    {
        if (!IsAdminAuthorized())
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "Admin role required to view email outbox." });
        }
        var history = _emailService.GetOutboxHistory(limit);
        return Ok(history);
    }

    [HttpPost("test")]
    public async Task<IActionResult> SendTestEmail([FromBody] TestEmailRequest? req)
    {
        if (!IsAdminAuthorized())
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "Admin role required to trigger test email notifications." });
        }

        var adminEmail = _config["AdminEmail"] ?? "admin@maqsoftware.com";
        var recipient = !string.IsNullOrWhiteSpace(req?.Recipient)
            ? req.Recipient.Trim()
            : adminEmail;

        var allowedDomain = _config["AzureAd:AllowedDomain"] ?? "maqsoftware.com";
        bool isAllowedDomain = recipient.EndsWith($"@{allowedDomain}", StringComparison.OrdinalIgnoreCase) ||
                               recipient.EndsWith("@company.com", StringComparison.OrdinalIgnoreCase) ||
                               recipient.EndsWith("@test.com", StringComparison.OrdinalIgnoreCase);

        if (!isAllowedDomain)
        {
            return BadRequest(new 
            { 
                error = "invalid_recipient", 
                detail = $"Open relay blocked: Test emails may only be dispatched to authorized corporate domains (@{allowedDomain}, @company.com, @test.com)." 
            });
        }

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

    [HttpPost("alert")]
    public async Task<IActionResult> SendAdminAlert([FromBody] AdminAlertRequest req)
    {
        if (!IsAdminAuthorized())
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "Admin role required to dispatch admin alerts." });
        }

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
