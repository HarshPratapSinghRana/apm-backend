using System.Collections.Generic;
using System.Threading.Tasks;
using CipBackend.Models;

namespace CipBackend.Services.Interfaces;

public interface IReviewCommentService
{
    Task<ReviewComment> AddCommentAsync(string submissionId, string authorEmail, string authorRole, AddReviewCommentRequest req);
    Task<ReviewComment> AddReplyAsync(string submissionId, string commentId, string authorEmail, string authorRole, string replyText);
    Task<IEnumerable<ReviewComment>> GetCommentsAsync(string submissionId, string? filePath = null);
}
