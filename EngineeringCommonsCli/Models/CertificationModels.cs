using System;
using System.Collections.Generic;

namespace EngineeringCommonsCli.Models;

public class PillarScoreCliDto
{
    public double Score { get; set; }
    public double Weight { get; set; }
    public double WeightedScore { get; set; }
    public double Threshold { get; set; }
    public bool Passed { get; set; }
    public int ActiveUsers { get; set; }
    public int TotalInvocations { get; set; }
    public double AvgRating { get; set; }
    public int ReviewCount { get; set; }
    public bool IsProvisional { get; set; }
    public int DocsScore { get; set; }
    public int TtfeScore { get; set; }
    public int ConfigScore { get; set; }
    public double GoldenTestPassRate { get; set; }
    public int SchemaScore { get; set; }
    public int SecurityScore { get; set; }
    public double Fer { get; set; }
    public int FatalCrashes { get; set; }
    public int AvgLatencyMs { get; set; }
    public bool IsLatencyExempt { get; set; }
    public bool SampleSizeSufficient { get; set; }
}

public class CertificationPillarsCliDto
{
    public PillarScoreCliDto? Adoption { get; set; }
    public PillarScoreCliDto? Feedback { get; set; }
    public PillarScoreCliDto? Dx { get; set; }
    public PillarScoreCliDto? Technical { get; set; }
    public PillarScoreCliDto? Health { get; set; }
}

public class HardGatesCliDto
{
    public bool SchemaValidation { get; set; }
    public bool SecurityScan { get; set; }
    public bool GoldenTests { get; set; }
    public bool CrashSafety { get; set; }
    public bool AllPassed { get; set; }
}

public class CertificationCriteriaCliDto
{
    public bool ReviewHistory { get; set; }
    public bool ApprovalHistory { get; set; }
    public bool Usage { get; set; }
    public bool Reliability { get; set; }
    public bool QualityChecks { get; set; }
    public bool UserFeedback { get; set; }
    public bool AllPassed { get; set; }
}

public class CertificationMetricsCliDto
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

public class CertificationEvaluationCliDto
{
    public string ArtifactId { get; set; } = string.Empty;
    public bool Eligible { get; set; }
    public string Badge { get; set; } = "Community";
    public string Status { get; set; } = "NOT_CERTIFIED";
    public string CurrentVersion { get; set; } = "1.0.0";
    public double? CompositeScore { get; set; }
    public CertificationPillarsCliDto? Pillars { get; set; }
    public HardGatesCliDto? HardGates { get; set; }
    public CertificationCriteriaCliDto? Criteria { get; set; }
    public CertificationMetricsCliDto? Metrics { get; set; }
    public string Reason { get; set; } = string.Empty;
    public DateTime EvaluatedAt { get; set; }
}

public class CertificationStatusCliDto
{
    public string ArtifactId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Version { get; set; } = "1.0.0";
    public string ArtifactType { get; set; } = "agent";
    public string AuthorId { get; set; } = string.Empty;
    public string ContentHash { get; set; } = string.Empty;
    public string TamperStatus { get; set; } = "VERIFIED";
    public string Badge { get; set; } = "Community";
    public double? CompositeScore { get; set; }
    public bool IsCertified { get; set; }
    public string Status { get; set; } = "NOT_CERTIFIED";
    public string CertifiedVersion { get; set; } = "1.0.0";
    public DateTime? CertifiedAt { get; set; }
    public string? CertifiedByEmail { get; set; }
    public DateTime? RevokedAt { get; set; }
    public string? RevokedByEmail { get; set; }
    public string? RevocationReason { get; set; }
    public string Reason { get; set; } = string.Empty;
    public CertificationPillarsCliDto? Pillars { get; set; }
    public HardGatesCliDto? HardGates { get; set; }
    public CertificationCriteriaCliDto? Criteria { get; set; }
    public CertificationMetricsCliDto? Metrics { get; set; }
}

public class CertificationAuditEntryCliDto
{
    public string Id { get; set; } = string.Empty;
    public string ArtifactId { get; set; } = string.Empty;
    public string Version { get; set; } = "1.0.0";
    public string OldBadge { get; set; } = string.Empty;
    public string NewBadge { get; set; } = string.Empty;
    public string TriggerReason { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
}

public class CertificationAuditLogResponseCliDto
{
    public string ArtifactId { get; set; } = string.Empty;
    public int TotalEntries { get; set; }
    public List<CertificationAuditEntryCliDto> Entries { get; set; } = new();
}

public class CertificationIntegrityResultCliDto
{
    public string ArtifactId { get; set; } = string.Empty;
    public string Version { get; set; } = "1.0.0";
    public string CurrentContentHash { get; set; } = string.Empty;
    public string RegisteredContentHash { get; set; } = string.Empty;
    public bool IsIntegrityVerified { get; set; }
    public string TamperStatus { get; set; } = "VERIFIED";
    public DateTime CheckedAt { get; set; }
}

public class CertificationRecheckResultCliDto
{
    public bool Success { get; set; }
    public string ArtifactId { get; set; } = string.Empty;
    public string OldBadge { get; set; } = string.Empty;
    public string NewBadge { get; set; } = string.Empty;
    public CertificationStatusCliDto? Record { get; set; }
    public CertificationAuditEntryCliDto? AuditEntry { get; set; }
}
