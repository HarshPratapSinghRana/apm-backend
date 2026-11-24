using System.Collections.Generic;
using System.Threading.Tasks;
using EngineeringCommons.Backend.Models;

namespace EngineeringCommons.Backend.Services.Interfaces;

public class CertificationOptions
{
    public int MinApprovedReviews { get; set; } = 1;
    public double MinApprovalRate { get; set; } = 0.80; // 80%
    public int MaxCriticalIssues { get; set; } = 0;
    public int MinDownloads { get; set; } = 1;
    public int MinUsageCount { get; set; } = 1;
    public int MinActiveUsers { get; set; } = 1;
    public double MinReliabilityRate { get; set; } = 0.95; // 95%
    public int ReevaluationIntervalDays { get; set; } = 30;
}

public interface ICertificationService
{
    Task<CertificationEvaluationDto> EvaluateCertificationAsync(string artifactId);
    Task<CertificationStatusDto> GetCertificationStatusAsync(string artifactId);
    Task<CertificationEvaluationDto> RequestCertificationAsync(string artifactId, string requestedByEmail);
    Task<CertificationStatusDto> CertifyArtifactAsync(string artifactId, string certifiedByEmail, string? version = null, string? reason = null);
    Task<CertificationStatusDto> RevokeCertificationAsync(string artifactId, string revokedByEmail, string reason);
    Task<bool> IsCertifiedAsync(string artifactId);
    Task<Dictionary<string, CertificationStatusDto>> GetCertificationsMapAsync();
}
