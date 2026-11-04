using System.Threading.Tasks;
using CipBackend.Models;

namespace CipBackend.Services.Interfaces;

public interface IReviewThreadService
{
    Task<ReviewThread?> GetThreadAsync(string reviewId, string userEmail, string userRole);
    Task<ReviewMessage?> AddMessageAsync(string reviewId, string authorEmail, string authorRole, string message);
    Task<ReviewThread?> UpdateStatusAsync(string reviewId, string userEmail, string userRole, ThreadStatus status);
}
