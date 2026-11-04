using System.Collections.Generic;
using System.Threading.Tasks;
using CipBackend.Models;

namespace CipBackend.Services.Interfaces;

public interface IBountyService
{
    Task<BountyDto> CreateBountyAsync(CreateBountyRequest req, string creatorEmail);
    Task<List<BountyDto>> GetBountiesAsync(string userEmail, string? category = null, string? stage = null);
    Task<BountyDetailDto?> GetBountyByIdAsync(string id, string userEmail);
    Task<BountyDto> ClaimBountyAsync(string id, string userEmail);
    Task<BountyDto> ReleaseBountyAsync(string id, string userEmail);
    Task<BountyDetailDto> SubmitCodeAsync(string id, string userEmail, BountySubmissionRequest req);
    Task<BountyDetailDto> ReviewCodeAsync(string id, string reviewerEmail, BountyReviewRequest req);
    Task<BountyDetailDto> RunTestsAsync(string id, string testerEmail, BountyTestRunRequest req);
    Task<BountyDetailDto> SetFeedbackChoiceAsync(string id, string producerEmail, string choice);
    Task<BountyDto> CompleteBountyAsync(string id, string userEmail);
    Task<bool> ReportIssueAsync(string id, string reporterEmail, string description, string? severity = null);
    Task<MyWorkSummaryDto> GetMyWorkSummaryAsync(string userEmail);
    Task<BountyAnalyticsDto> GetBountyAnalyticsAsync();
    int ProcessAutoReleases();
}
