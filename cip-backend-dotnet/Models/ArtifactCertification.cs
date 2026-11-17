using System;
using System.Collections.Generic;

namespace EngineeringCommons.Backend.Models;

public enum CertificationStatus
{
    NotCertified,
    Eligible,
    Certified,
    Revoked
}

public class ArtifactCertification
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string ArtifactId { get; set; } = string.Empty;
    public CertificationStatus Status { get; set; } = CertificationStatus.NotCertified;
    public string CertifiedVersion { get; set; } = "1.0.0";
    public DateTime? CertifiedAt { get; set; }
    public string? CertifiedByEmail { get; set; }
    public DateTime? RevokedAt { get; set; }
    public string? RevokedByEmail { get; set; }
    public string? RevocationReason { get; set; }
    public DateTime LastEvaluatedAt { get; set; } = DateTime.UtcNow;
    public string? Reason { get; set; }
    public string? CriteriaJson { get; set; }
    public string? MetricsJson { get; set; }
}

public class CertificationCriteriaResult
{
    public bool ReviewHistory { get; set; }
    public bool ApprovalHistory { get; set; }
    public bool Usage { get; set; }
    public bool Reliability { get; set; }
    public bool QualityChecks { get; set; }
    public bool UserFeedback { get; set; }
    public bool AllPassed => ReviewHistory && ApprovalHistory && Usage && Reliability && QualityChecks && UserFeedback;
}

public class CertificationMetricsSnapshot
{
    public int Downloads { get; set; }
    public int TotalUsage { get; set; }
    public int ActiveUsers { get; set; }
    public int ApprovedReviews { get; set; }
    public int RejectedReviews { get; set; }
    public double ApprovalRate { get; set; }
    public double ReliabilityRate { get; set; }
    public int CriticalIssues { get; set; }
}

public class CertificationEvaluationDto
{
    public string ArtifactId { get; set; } = string.Empty;
    public bool Eligible { get; set; }
    public string Status { get; set; } = "NOT_CERTIFIED";
    public string CurrentVersion { get; set; } = "1.0.0";
    public CertificationCriteriaResult Criteria { get; set; } = new();
    public CertificationMetricsSnapshot Metrics { get; set; } = new();
    public string Reason { get; set; } = string.Empty;
    public DateTime EvaluatedAt { get; set; } = DateTime.UtcNow;
}

public class CertificationStatusDto
{
    public string ArtifactId { get; set; } = string.Empty;
    public bool IsCertified { get; set; }
    public string Status { get; set; } = "NOT_CERTIFIED";
    public string CertifiedVersion { get; set; } = "1.0.0";
    public DateTime? CertifiedAt { get; set; }
    public string? CertifiedByEmail { get; set; }
    public DateTime? RevokedAt { get; set; }
    public string? RevokedByEmail { get; set; }
    public string? RevocationReason { get; set; }
    public string Reason { get; set; } = string.Empty;
    public CertificationCriteriaResult? Criteria { get; set; }
    public CertificationMetricsSnapshot? Metrics { get; set; }
}
