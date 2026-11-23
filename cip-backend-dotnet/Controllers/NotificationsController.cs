using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using EngineeringCommons.Backend.Models;
using EngineeringCommons.Backend.Services.Interfaces;

namespace EngineeringCommons.Backend.Controllers;

[ApiController]
[Authorize]
[Route("api/notifications")]
public class NotificationsController : ControllerBase
{
    private readonly INotificationService _notifications;

    public NotificationsController(INotificationService notifications)
    {
        _notifications = notifications ?? throw new ArgumentNullException(nameof(notifications));
    }

    [HttpGet]
    public async Task<IActionResult> GetNotifications([FromQuery] bool unreadOnly = false)
    {
        var email = User.Identity?.Name ?? string.Empty;
        if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

        var list = await _notifications.GetUserNotificationsAsync(email, unreadOnly);

        var dtos = list.Select(n => new NotificationDto
        {
            Id = n.Id,
            Type = n.Type.ToString(),
            Title = n.Title,
            Message = n.Message,
            ThreadId = n.ThreadId,
            SubmissionId = n.SubmissionId,
            ArtifactId = n.ArtifactId,
            ArtifactName = n.ArtifactName,
            Version = n.ArtifactVersion,
            CreatedAt = n.CreatedAt,
            IsRead = n.IsRead
        });

        return Ok(dtos);
    }

    [HttpPost("{id}/read")]
    public async Task<IActionResult> MarkAsRead(string id)
    {
        var email = User.Identity?.Name ?? string.Empty;
        if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

        var success = await _notifications.MarkAsReadAsync(id, email);
        if (!success)
        {
            return NotFound(new { error = "Notification not found or access denied." });
        }

        return Ok(new { success = true, id });
    }

    [HttpPost("thread/{threadId}/read")]
    public async Task<IActionResult> MarkThreadAsRead(string threadId)
    {
        var email = User.Identity?.Name ?? string.Empty;
        if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

        var all = await _notifications.GetUserNotificationsAsync(email, true);
        var threadNotifs = all.Where(n => n.ThreadId == threadId || n.SubmissionId == threadId).ToList();

        foreach (var n in threadNotifs)
        {
            await _notifications.MarkAsReadAsync(n.Id, email);
        }

        return Ok(new { success = true, threadId, markedCount = threadNotifs.Count });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteNotification(string id)
    {
        var email = User.Identity?.Name ?? string.Empty;
        if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

        var success = await _notifications.DeleteNotificationAsync(id, email);
        if (!success)
        {
            return NotFound(new { error = "Notification not found or access denied." });
        }

        return Ok(new { success = true, id });
    }

    [HttpDelete]
    [HttpDelete("clear-all")]
    [HttpDelete("all")]
    public async Task<IActionResult> ClearAllNotifications()
    {
        var email = User.Identity?.Name ?? string.Empty;
        if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

        var count = await _notifications.ClearNotificationsAsync(email);
        return Ok(new { success = true, deletedCount = count });
    }
}
