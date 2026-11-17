using System.Threading.Tasks;
using EngineeringCommons.Backend.Models;

namespace EngineeringCommons.Backend.Services.Interfaces;

public interface IReviewThreadService
{
    Task<ReviewThread?> GetThreadAsync(string reviewId, string userEmail, string userRole);
    Task<ReviewMessage?> AddMessageAsync(string reviewId, string authorEmail, string authorRole, string message);
    Task<ReviewThread?> UpdateStatusAsync(string reviewId, string userEmail, string userRole, ThreadStatus status);
}
