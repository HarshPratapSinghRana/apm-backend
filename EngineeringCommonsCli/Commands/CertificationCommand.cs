using System;
using System.Linq;
using EngineeringCommonsCli.Models;
using EngineeringCommonsCli.Services.Interfaces;

namespace EngineeringCommonsCli.Commands;

public class CertificationCommand
{
    private readonly IBackendClient _backend;
    private readonly IAuthenticationService _authProvider;

    public CertificationCommand(IBackendClient backend, IAuthenticationService authProvider)
    {
        _backend = backend;
        _authProvider = authProvider;
    }

    public int Invoke(string[] args)
    {
        var session = _authProvider.CurrentSessionAsync().GetAwaiter().GetResult();
        if (session == null)
        {
            Console.WriteLine("ERROR: You must be logged in to view or manage artifact certifications.\nRun: engineering-commons login");
            return 1;
        }

        if (args.Length == 0)
        {
            PrintUsage();
            return 1;
        }

        var subCommand = args[0].ToLowerInvariant();
        var remaining = args.Skip(1).ToArray();

        return subCommand switch
        {
            "status" or "info" => HandleStatus(remaining),
            "check" or "eval" or "evaluate" or "eligibility" => HandleCheck(remaining),
            "recheck" or "refresh" or "recalculate" => HandleRecheck(remaining),
            "history" or "audit" or "log" or "trail" => HandleHistory(remaining),
            "integrity" or "verify" or "hash" or "checksum" => HandleIntegrity(remaining),
            "request" or "apply" => HandleRequest(remaining),
            "certify" or "approve" => HandleCertify(remaining),
            "revoke" => HandleRevoke(remaining),
            _ => HandleDirectStatusOrHelp(args)
        };
    }

    private void PrintUsage()
    {
        Console.WriteLine("Engineering Commons AI Artifact Certification Commands:");
        Console.WriteLine("  engineering-commons certification status <artifact>                 - View current badge, version, & SHA-256 hash");
        Console.WriteLine("  engineering-commons certification check <artifact>                  - View comprehensive 5-pillar score breakdown");
        Console.WriteLine("  engineering-commons certification recheck <artifact>                - Force score recalculation from live ADO telemetry");
        Console.WriteLine("  engineering-commons certification history <artifact>                - View immutable audit trail of badge transitions");
        Console.WriteLine("  engineering-commons certification integrity <artifact>              - Verify cryptographic SHA-256 package hash");
        Console.WriteLine("  engineering-commons certification request <artifact>                - Submit a certification request");
        Console.WriteLine("  engineering-commons certification certify <artifact>                - [Reviewer/Admin] Certify artifact");
        Console.WriteLine("  engineering-commons certification revoke <artifact> --reason <text> - [Reviewer/Admin] Revoke certification");
    }

    private int HandleDirectStatusOrHelp(string[] args)
    {
        if (args.Length > 0 && !args[0].StartsWith('-'))
        {
            return HandleStatus(args);
        }
        PrintUsage();
        return 1;
    }

    private int HandleStatus(string[] args)
    {
        if (args.Length == 0)
        {
            Console.WriteLine("Usage: engineering-commons certification status <artifact-name>");
            return 1;
        }

        var artifactName = args[0].Trim();
        Console.WriteLine($"Fetching certification status for '{artifactName}' from Azure DevOps...");

        var status = _backend.GetCertificationStatusAsync(artifactName).GetAwaiter().GetResult();
        if (status == null)
        {
            Console.WriteLine($"ERROR: Unable to fetch certification status for '{artifactName}'.");
            return 1;
        }

        string badgeSymbol = status.Badge switch
        {
            "Certified" => "[ 🏆 CERTIFIED (GOLD) ]",
            "Verified" => "[ 🛡️ VERIFIED ]",
            "At-Risk" => "[ ⚠️ AT-RISK ]",
            "Revoked" => "[ 🚫 REVOKED ]",
            _ => "[ 🌱 COMMUNITY ]"
        };

        Console.WriteLine($"\n========================================================");
        Console.WriteLine($"  Enterprise AI Artifact Certification Status");
        Console.WriteLine($"========================================================");
        Console.WriteLine($"  Artifact ID:          {status.ArtifactId}");
        Console.WriteLine($"  Version:              {status.Version}");
        Console.WriteLine($"  Type:                 {status.ArtifactType}");
        Console.WriteLine($"  Badge Tier:           {badgeSymbol}");
        Console.WriteLine($"  Status:               {status.Status}");
        Console.WriteLine($"  Composite DHS Score:  {(status.CompositeScore.HasValue ? $"{status.CompositeScore.Value:F1} / 100" : "Insufficient Telemetry Data")}");
        Console.WriteLine($"  Content SHA-256:      {(string.IsNullOrEmpty(status.ContentHash) ? "Not Computed" : status.ContentHash)}");
        Console.WriteLine($"  Integrity Status:     {status.TamperStatus}");
        if (status.IsCertified && status.CertifiedAt.HasValue)
        {
            Console.WriteLine($"  Certified At:         {status.CertifiedAt.Value:yyyy-MM-dd HH:mm} UTC");
            Console.WriteLine($"  Certified By:         {status.CertifiedByEmail ?? "Enterprise Reviewer"}");
            Console.WriteLine($"  Certified Version:    {status.CertifiedVersion}");
        }
        if (status.RevokedAt.HasValue)
        {
            Console.WriteLine($"  Revoked At:           {status.RevokedAt.Value:yyyy-MM-dd HH:mm} UTC");
            Console.WriteLine($"  Revocation Reason:    {status.RevocationReason}");
        }
        Console.WriteLine($"  Summary:              {status.Reason}");
        Console.WriteLine($"========================================================\n");
        return 0;
    }

    private int HandleCheck(string[] args)
    {
        if (args.Length == 0)
        {
            Console.WriteLine("Usage: engineering-commons certification check <artifact-name>");
            return 1;
        }

        var artifactName = args[0].Trim();
        Console.WriteLine($"Evaluating 5 certification pillars for '{artifactName}' from ADO data...");

        var status = _backend.GetCertificationStatusAsync(artifactName).GetAwaiter().GetResult();
        if (status == null)
        {
            Console.WriteLine($"ERROR: Failed to evaluate certification criteria for '{artifactName}'.");
            return 1;
        }

        var p = status.Pillars;
        var hg = status.HardGates;

        Console.WriteLine($"\n========================================================");
        Console.WriteLine($"  Dynamic Health Scorecard (5 Certification Pillars)");
        Console.WriteLine($"========================================================");
        Console.WriteLine($"  Artifact:             {status.ArtifactId} (v{status.Version})");
        Console.WriteLine($"  Overall Badge:        {status.Badge}");
        Console.WriteLine($"  Composite DHS Score:  {(status.CompositeScore.HasValue ? $"{status.CompositeScore.Value:F1} / 100" : "N/A")}");
        Console.WriteLine($"--------------------------------------------------------");

        if (p != null)
        {
            // Pillar 1: Adoption
            if (p.Adoption != null)
            {
                Console.WriteLine($"  [Pillar 1: Real-World Adoption (Weight: 25%)]");
                Console.WriteLine($"  • Score:              {p.Adoption.Score:F1} / 100 [{(p.Adoption.Passed ? "PASS" : "FAIL")}] (Min Threshold: 80.0)");
                Console.WriteLine($"  • Active Developers:  {p.Adoption.ActiveUsers} distinct non-author engineers (Min: 3)");
                Console.WriteLine($"  • Invocations:        {p.Adoption.TotalInvocations} runs (Rolling 30 days, velocity capped)");
            }

            // Pillar 2: Community Feedback
            if (p.Feedback != null)
            {
                Console.WriteLine($"\n  [Pillar 2: Community Feedback (Weight: 15%)]");
                Console.WriteLine($"  • Score:              {p.Feedback.Score:F1} / 100 [{(p.Feedback.Passed ? "PASS" : "FAIL")}] (Min Threshold: 84.0)");
                Console.WriteLine($"  • Average Rating:     {(p.Feedback.AvgRating > 0 ? $"{p.Feedback.AvgRating:F1} ★" : "No ratings yet")}");
                Console.WriteLine($"  • Total Reviews:      {p.Feedback.ReviewCount} valid developer ratings {(p.Feedback.IsProvisional ? "(Provisional Score Applied)" : "")}");
            }

            // Pillar 3: DX & Documentation
            if (p.Dx != null)
            {
                Console.WriteLine($"\n  [Pillar 3: Developer Experience & Docs (Weight: 15%)]");
                Console.WriteLine($"  • Score:              {p.Dx.Score:F1} / 100 [{(p.Dx.Passed ? "PASS" : "FAIL")}] (Min Threshold: 85.0)");
                Console.WriteLine($"  • Documentation:      {p.Dx.DocsScore} / 100 (Overview, Usage, Parameters, Examples, Troubleshooting)");
                Console.WriteLine($"  • Setup Complexity:   {(p.Dx.ConfigScore == 100 ? "Zero-Configuration (100/100)" : "Requires Configuration (50/100)")}");
            }

            // Pillar 4: Technical Conformance
            if (p.Technical != null)
            {
                Console.WriteLine($"\n  [Pillar 4: Technical Conformance & Test Suite (Weight: 20%)]");
                Console.WriteLine($"  • Score:              {p.Technical.Score:F1} / 100 [{(p.Technical.Passed ? "PASS" : "FAIL")}] (Min Threshold: 95.0)");
                Console.WriteLine($"  • Golden Test Suite:  {p.Technical.GoldenTestPassRate:F1}% Pass Rate (Min: 95.0%)");
                Console.WriteLine($"  • Schema Validation:  {(p.Technical.SchemaScore == 100 ? "100% Conforming (JSON-RPC 2.0 / MCP)" : "0% (Validation Errors)")}");
                Console.WriteLine($"  • Secret Scanning:    {(p.Technical.SecurityScore == 100 ? "0 Leaked Credentials Detected" : "CRITICAL SECRETS FOUND")}");
            }

            // Pillar 5: Health & Crash Safety
            if (p.Health != null)
            {
                Console.WriteLine($"\n  [Pillar 5: Operational Health & Crash Safety (Weight: 25%)]");
                if (p.Health.SampleSizeSufficient)
                {
                    Console.WriteLine($"  • Score:              {p.Health.Score:F1} / 100 [{(p.Health.Passed ? "PASS" : "FAIL")}] (Min Threshold: 95.0)");
                    Console.WriteLine($"  • Fatal Exception:    {p.Health.Fer:F1}% FER (Zero-Tolerance Gate: <= 1.0%)");
                    Console.WriteLine($"  • Fatal Crashes:      {p.Health.FatalCrashes} unhandled exceptions out of {p.Health.TotalInvocations} runs");
                    Console.WriteLine($"  • Latency SLA:        {(p.Health.IsLatencyExempt ? "Exempted (Autonomous Coding Agent / Workflow)" : $"{p.Health.AvgLatencyMs}ms (SLA <= 3000ms)")}");
                    Console.WriteLine($"  • Generic ESR:        100% OMITTED (User input errors never penalized)");
                }
                else
                {
                    Console.WriteLine($"  • Telemetry Data:     Insufficient (< 10 non-author invocations logged)");
                }
            }
        }

        if (hg != null)
        {
            Console.WriteLine($"\n--------------------------------------------------------");
            Console.WriteLine($"  Zero-Tolerance Hard Gates:");
            Console.WriteLine($"  [{(hg.SchemaValidation ? "✓" : "✗")}] Schema Validation Conformance (100% Required)");
            Console.WriteLine($"  [{(hg.SecurityScan ? "✓" : "✗")}] Static Secret & Security Scan (0 Secrets Required)");
            Console.WriteLine($"  [{(hg.GoldenTests ? "✓" : "✗")}] Golden Test Suite Pass Rate (>= 95% Required)");
            Console.WriteLine($"  [{(hg.CrashSafety ? "✓" : "✗")}] Pure Crash-Free Safety (FER <= 1.0% Required)");
        }

        Console.WriteLine($"\n  Conclusion:           {status.Reason}");
        Console.WriteLine($"========================================================\n");
        return 0;
    }

    private int HandleRecheck(string[] args)
    {
        if (args.Length == 0)
        {
            Console.WriteLine("Usage: engineering-commons certification recheck <artifact-name>");
            return 1;
        }

        var artifactName = args[0].Trim();
        Console.WriteLine($"Triggering immediate score recalculation for '{artifactName}' against rolling ADO telemetry...");

        var result = _backend.RecheckCertificationAsync(artifactName).GetAwaiter().GetResult();
        if (result == null || !result.Success)
        {
            Console.WriteLine($"ERROR: Failed to recalculate certification for '{artifactName}'.");
            return 1;
        }

        Console.WriteLine($"\n✓ RECHECK COMPLETED SUCCESSFULLY!");
        Console.WriteLine($"  Artifact:       {result.ArtifactId}");
        Console.WriteLine($"  Previous Badge: {result.OldBadge}");
        Console.WriteLine($"  Updated Badge:  {result.NewBadge}");
        if (result.Record?.CompositeScore.HasValue == true)
        {
            Console.WriteLine($"  New DHS Score:  {result.Record.CompositeScore.Value:F1} / 100");
        }
        if (result.AuditEntry != null)
        {
            Console.WriteLine($"  Audit ID:       {result.AuditEntry.Id}");
            Console.WriteLine($"  Trigger Reason: {result.AuditEntry.TriggerReason}");
            Console.WriteLine($"  Azure DevOps:   Committed and pushed to git repository branch 'main'.");
        }
        Console.WriteLine();
        return 0;
    }

    private int HandleHistory(string[] args)
    {
        if (args.Length == 0)
        {
            Console.WriteLine("Usage: engineering-commons certification history <artifact-name>");
            return 1;
        }

        var artifactName = args[0].Trim();
        Console.WriteLine($"Fetching immutable audit trail for '{artifactName}' from Azure DevOps...");

        var history = _backend.GetCertificationHistoryAsync(artifactName).GetAwaiter().GetResult();
        if (history == null || history.Entries.Count == 0)
        {
            Console.WriteLine($"No audit transitions found for '{artifactName}'.");
            return 0;
        }

        Console.WriteLine($"\n========================================================");
        Console.WriteLine($"  Immutable Certification Audit Trail: {history.ArtifactId}");
        Console.WriteLine($"========================================================");
        Console.WriteLine($"Total Historical Transitions: {history.TotalEntries}\n");

        foreach (var entry in history.Entries)
        {
            Console.WriteLine($"• [{entry.Timestamp:yyyy-MM-dd HH:mm:ss} UTC] {entry.OldBadge} ➔ {entry.NewBadge}");
            Console.WriteLine($"  Version: {entry.Version} | Audit ID: {entry.Id}");
            Console.WriteLine($"  Reason:  {entry.TriggerReason}");
            Console.WriteLine();
        }
        Console.WriteLine($"========================================================\n");
        return 0;
    }

    private int HandleIntegrity(string[] args)
    {
        if (args.Length == 0)
        {
            Console.WriteLine("Usage: engineering-commons certification integrity <artifact-name>");
            return 1;
        }

        var artifactName = args[0].Trim();
        Console.WriteLine($"Verifying cryptographic SHA-256 integrity for '{artifactName}' against Azure DevOps...");

        var integrity = _backend.VerifyCertificationIntegrityAsync(artifactName).GetAwaiter().GetResult();
        if (integrity == null)
        {
            Console.WriteLine($"ERROR: Unable to verify integrity for '{artifactName}'.");
            return 1;
        }

        Console.WriteLine($"\n========================================================");
        Console.WriteLine($"  Cryptographic Integrity Verification");
        Console.WriteLine($"========================================================");
        Console.WriteLine($"  Artifact:             {integrity.ArtifactId} (v{integrity.Version})");
        Console.WriteLine($"  Local Package Hash:   {integrity.CurrentContentHash}");
        Console.WriteLine($"  ADO Registry Hash:    {integrity.RegisteredContentHash}");
        Console.WriteLine($"  Integrity Status:     {(integrity.IsIntegrityVerified ? "✓ VERIFIED (Cryptographically Intact)" : "⚠️ TAMPER_DETECTED (Hash Mismatch)")}");
        Console.WriteLine($"  Checked At:           {integrity.CheckedAt:yyyy-MM-dd HH:mm:ss} UTC");
        Console.WriteLine($"========================================================\n");
        return integrity.IsIntegrityVerified ? 0 : 2;
    }

    private int HandleRequest(string[] args)
    {
        if (args.Length == 0)
        {
            Console.WriteLine("Usage: engineering-commons certification request <artifact-name>");
            return 1;
        }

        var artifactName = args[0].Trim();
        Console.WriteLine($"Submitting certification request for '{artifactName}'...");

        var result = _backend.RequestCertificationAsync(artifactName).GetAwaiter().GetResult();
        if (result == null)
        {
            Console.WriteLine($"ERROR: Failed to submit certification request for '{artifactName}'.");
            return 1;
        }

        Console.WriteLine($"✓ SUCCESS: Certification request submitted for '{artifactName}'.");
        Console.WriteLine($"  Badge:       {result.Badge}");
        Console.WriteLine($"  Status:      {result.Status}");
        Console.WriteLine($"  Reason:      {result.Reason}");
        return 0;
    }

    private int HandleCertify(string[] args)
    {
        if (args.Length == 0)
        {
            Console.WriteLine("Usage: engineering-commons certification certify <artifact-name> [--version <v>] [--reason <text>]");
            return 1;
        }

        var artifactName = args[0].Trim();
        string? version = GetOptionValue(args, "--version", "-v");
        string? reason = GetOptionValue(args, "--reason", "-r");

        Console.WriteLine($"Certifying artifact '{artifactName}' (RBAC: Reviewer/Admin)...");

        var result = _backend.CertifyArtifactAsync(artifactName, version, reason).GetAwaiter().GetResult();
        if (result == null || !result.IsCertified)
        {
            Console.WriteLine($"ERROR: Failed to certify '{artifactName}'. Ensure you are logged in as a Reviewer/Admin.");
            return 1;
        }

        Console.WriteLine($"✓ SUCCESS: Artifact '{artifactName}' is now officially CERTIFIED.");
        Console.WriteLine($"  Certified Version: {result.CertifiedVersion}");
        Console.WriteLine($"  Certified At:      {result.CertifiedAt?.ToString("yyyy-MM-dd HH:mm") ?? "Now"}");
        Console.WriteLine($"  Certified By:      {result.CertifiedByEmail ?? "Enterprise Reviewer"}");
        Console.WriteLine($"  Reason:            {result.Reason}");
        return 0;
    }

    private int HandleRevoke(string[] args)
    {
        if (args.Length == 0)
        {
            Console.WriteLine("Usage: engineering-commons certification revoke <artifact-name> --reason <text>");
            return 1;
        }

        var artifactName = args[0].Trim();
        string? reason = GetOptionValue(args, "--reason", "-r");

        if (string.IsNullOrWhiteSpace(reason))
        {
            Console.WriteLine("ERROR: A valid reason is required to revoke certification.\nExample: engineering-commons certification revoke <artifact> --reason \"Security vulnerability\"");
            return 1;
        }

        Console.WriteLine($"Revoking certification for '{artifactName}' (RBAC: Reviewer/Admin)...");

        var result = _backend.RevokeCertificationAsync(artifactName, reason).GetAwaiter().GetResult();
        if (result == null)
        {
            Console.WriteLine($"ERROR: Failed to revoke certification for '{artifactName}'. Ensure you are logged in as a Reviewer/Admin.");
            return 1;
        }

        Console.WriteLine($"✓ SUCCESS: Certification for '{artifactName}' has been REVOKED.");
        Console.WriteLine($"  Status:            {result.Status}");
        Console.WriteLine($"  Revoked By:        {result.RevokedByEmail ?? "Enterprise Admin"}");
        Console.WriteLine($"  Revocation Reason: {result.RevocationReason}");
        return 0;
    }

    private static string? GetOptionValue(string[] args, params string[] optionNames)
    {
        for (int i = 0; i < args.Length; i++)
        {
            foreach (var opt in optionNames)
            {
                if (args[i].Equals(opt, StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length && !args[i + 1].StartsWith('-'))
                {
                    return args[i + 1].Trim();
                }
                if (args[i].StartsWith(opt + "=", StringComparison.OrdinalIgnoreCase))
                {
                    return args[i].Substring(opt.Length + 1).Trim();
                }
            }
        }
        return null;
    }
}
