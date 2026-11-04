using System.Collections.Generic;
using System.Threading.Tasks;
using CipBackend.Models;

namespace CipBackend.Services.Interfaces;

public interface INotificationService
{
    Task<Notification> CreateNotificationAsync(Notification notification);
    Task<IEnumerable<Notification>> GetUserNotificationsAsync(string recipientEmail, bool unreadOnly = false);
    Task<bool> MarkAsReadAsync(string notificationId, string recipientEmail);
    Task<Notification?> GetNotificationAsync(string notificationId, string recipientEmail);
    Task<bool> DeleteNotificationAsync(string notificationId, string recipientEmail);
    Task<int> ClearNotificationsAsync(string recipientEmail);
}
