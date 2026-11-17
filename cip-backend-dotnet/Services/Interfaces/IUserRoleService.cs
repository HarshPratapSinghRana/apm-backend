using System.Collections.Generic;
using System.Threading.Tasks;
using EngineeringCommons.Backend.Models;

namespace EngineeringCommons.Backend.Services.Interfaces;

public interface IUserRoleService
{
    Task<string> ResolveUserRoleAsync(string email);
    Task<bool> IsAdminAsync(string email);
    Task<bool> IsCertifiedReviewerAsync(string email);
    Task<UserAccessRequest> SubmitAccessRequestAsync(string userEmail, string requestedRole, string? reason);
    Task<IEnumerable<UserAccessRequest>> GetAccessRequestsAsync(string? status = null);
    Task<IEnumerable<UserAccessRequest>> GetUserRequestsAsync(string userEmail);
    Task<UserAccessRequest?> ApproveRequestAsync(string requestId, string adminEmail, string? notes = null);
    Task<UserAccessRequest?> RejectRequestAsync(string requestId, string adminEmail, string? notes = null);
    Task<UserRoleAssignment> RevokeAccessAsync(string targetEmail, string adminEmail, string? notes = null);
    Task<UserRoleAssignment> CertifyReviewerAsync(string targetEmail, string adminEmail, string? notes = null);
    Task<IEnumerable<UserRoleAssignment>> GetAllRolesAsync();
    Task<bool> SyncToAzureDevOpsAsync();
}
