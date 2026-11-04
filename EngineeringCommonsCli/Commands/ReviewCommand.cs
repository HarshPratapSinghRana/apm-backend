using EngineeringCommonsCli.Models;
using EngineeringCommonsCli.Services.Implementations;
using EngineeringCommonsCli.Services.Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;

namespace EngineeringCommonsCli.Commands;

public class ReviewCommand
{
    private readonly IBackendClient _backend;
    private readonly IAuthenticationService _authProvider;
    private readonly IUnifiedDiffRenderer _diffRenderer;

    public ReviewCommand(
        IBackendClient backend,
        IAuthenticationService authProvider,
        IUnifiedDiffRenderer? diffRenderer = null)
    {
        _backend = backend;
        _authProvider = authProvider;
        _diffRenderer = diffRenderer ?? new UnifiedDiffRenderer();
    }

    public int Invoke(string[] args)
    {
        var session = _authProvider.CurrentSessionAsync().GetAwaiter().GetResult();
        if (session == null)
        {
            Console.WriteLine("ERROR: You are not logged in. Run:\n  engineering-commons login");
            return 1;
        }

        // Direct subcommands: engineering-commons review comment <reviewId> ...
        if (args.Length >= 2 && args[0].Equals("comment", StringComparison.OrdinalIgnoreCase))
        {
            return HandleDirectComment(args.Skip(1).ToArray());
        }
        if (args.Length >= 2 && args[0].Equals("reply", StringComparison.OrdinalIgnoreCase))
        {
            return HandleDirectReply(args.Skip(1).ToArray());
        }
        if (args.Length >= 2 && (args[0].Equals("request-changes", StringComparison.OrdinalIgnoreCase) || args[0].Equals("changes", StringComparison.OrdinalIgnoreCase)))
        {
            return HandleDirectRequestChanges(args.Skip(1).ToArray());
        }
        if (args.Length >= 2 && args[0].Equals("approve", StringComparison.OrdinalIgnoreCase))
        {
            return HandleDirectApprove(args.Skip(1).ToArray());
        }
        if (args.Length >= 2 && args[0].Equals("reject", StringComparison.OrdinalIgnoreCase))
        {
            return HandleDirectReject(args.Skip(1).ToArray());
        }

        Console.WriteLine("Fetching pending review submissions...");
        var pending = _backend.GetPendingReviewsAsync().GetAwaiter().GetResult().ToList();

        if (pending.Count == 0)
        {
            Console.WriteLine("\nNo pending submissions to review.");
            return 0;
        }

        Console.WriteLine($"\nFound {pending.Count} pending submission(s):\n");
        Console.WriteLine($"{"#",-4} {"REVIEW ID",-38} {"ARTIFACT",-18} {"PRODUCER",-20} {"SLA REMAINING",-22} {"STATUS"}");
        Console.WriteLine(new string('-', 116));

        for (int i = 0; i < pending.Count; i++)
        {
            var p = pending[i];
            var slaDisplay = !string.IsNullOrWhiteSpace(p.SlaRemainingFormatted) ? p.SlaRemainingFormatted : $"{p.SlaRemainingMinutes:F0}m";
            var slaStatus = p.IsSlaBreached ? "BREACHED" : (p.IsSlaWarning ? "EXPIRING SOON" : "ON TRACK");
            Console.WriteLine($"[{i + 1}] {p.Id,-38} {p.ArtifactId,-18} {p.ProducerEmail,-20} {slaDisplay,-22} {slaStatus}");
        }

        PendingReviewDto selected;
        if (args.Length > 0 && !args[0].StartsWith('-'))
        {
            var targetId = args[0];
            var match = pending.FirstOrDefault(p => p.Id.Equals(targetId, StringComparison.OrdinalIgnoreCase) || p.ArtifactId.Equals(targetId, StringComparison.OrdinalIgnoreCase));
            if (match == null)
            {
                Console.WriteLine($"ERROR: Review '{targetId}' not found among pending submissions.");
                return 1;
            }
            selected = match;
        }
        else
        {
            Console.Write($"\nSelect submission to inspect [1-{pending.Count}]: ");
            var input = Console.ReadLine()?.Trim();
            if (int.TryParse(input, out int choice) && choice >= 1 && choice <= pending.Count)
            {
                selected = pending[choice - 1];
            }
            else
            {
                selected = pending[0];
                Console.WriteLine($"Defaulting to item #1 ({selected.ArtifactId})");
            }
        }

        return ReviewLoop(selected.Id, selected.ArtifactId);
    }

    private int ReviewLoop(string reviewId, string artifactName)
    {
        while (true)
        {
            Console.WriteLine($"\n================================================================================");
            Console.WriteLine($"   REVIEW SUBMISSION: {artifactName} (Review ID: {reviewId})");
            Console.WriteLine($"================================================================================\n");

            var detail = _backend.GetReviewDetailAsync(reviewId).GetAwaiter().GetResult();
            var diff = _backend.GetReviewDiffAsync(reviewId).GetAwaiter().GetResult();
            var comments = _backend.GetReviewCommentsAsync(reviewId).GetAwaiter().GetResult().ToList();
            var thread = _backend.GetReviewThreadAsync(reviewId).GetAwaiter().GetResult();

            // 1. Render Unified Diff
            if (diff != null)
            {
                Console.WriteLine("--- UNIFIED DIFF ---");
                _diffRenderer.RenderDiff(diff, Console.Out, useColor: true);
            }
            else if (detail != null)
            {
                Console.WriteLine($"Artifact: {detail.ArtifactId} | Producer: {detail.ProducerEmail}");
                Console.WriteLine("Raw Content Preview:\n" + detail.Content);
            }

            // 2. Render Official Review Feedback
            if (!string.IsNullOrEmpty(detail?.Feedback) || !string.IsNullOrEmpty(thread?.Feedback))
            {
                var fb = !string.IsNullOrEmpty(detail?.Feedback) ? detail?.Feedback : thread?.Feedback;
                Console.WriteLine("\n--------------------------------------------------------------------------------");
                Console.WriteLine($"📝 OFFICIAL REVIEW FEEDBACK: {fb}");
                Console.WriteLine("--------------------------------------------------------------------------------");
            }

            // 3. Render File & Line Comments
            Console.WriteLine($"\n--------------------------------------------------------------------------------");
            Console.WriteLine($"💬 FILE & LINE COMMENTS ({comments.Count})");
            Console.WriteLine("--------------------------------------------------------------------------------");
            if (comments.Count == 0)
            {
                Console.WriteLine("  (No file or line comments yet.)");
            }
            else
            {
                for (int i = 0; i < comments.Count; i++)
                {
                    var c = comments[i];
                    var lineStr = c.LineNumber.HasValue ? $"Line {c.LineNumber}" : (c.OldLineNumber.HasValue ? $"Line {c.OldLineNumber} (deleted)" : "Entire File");
                    Console.WriteLine($"\n  [{i + 1}] 📄 {c.FilePath} : {lineStr} (ID: {c.Id})");
                    Console.WriteLine($"      Author: {c.AuthorEmail} [{c.AuthorRole}] at {c.CreatedAt.ToLocalTime():yyyy-MM-dd HH:mm}");
                    if (!string.IsNullOrEmpty(c.OldContent)) Console.WriteLine($"      - {c.OldContent}");
                    if (!string.IsNullOrEmpty(c.NewContent)) Console.WriteLine($"      + {c.NewContent}");
                    Console.WriteLine($"      Comment: {c.Comment}");

                    if (c.Replies != null && c.Replies.Count > 0)
                    {
                        foreach (var r in c.Replies)
                        {
                            Console.WriteLine($"         ↳ [{r.AuthorRole}] {r.AuthorEmail}: {r.Comment}");
                        }
                    }
                }
            }

            // 4. Render General Messages
            if (thread?.Messages != null && thread.Messages.Count > 0)
            {
                Console.WriteLine($"\n--------------------------------------------------------------------------------");
                Console.WriteLine($"📋 GENERAL DISCUSSION MESSAGES ({thread.Messages.Count})");
                Console.WriteLine("--------------------------------------------------------------------------------");
                foreach (var m in thread.Messages)
                {
                    Console.WriteLine($"  [{m.AuthorRole}] {m.AuthorEmail} ({m.CreatedAt.ToLocalTime():HH:mm}): {m.Message}");
                }
            }

            // 5. Interactive Review Menu
            Console.WriteLine("\n================================================================================");
            Console.WriteLine("  REVIEW ACTIONS:");
            Console.WriteLine("  [1] Add File / Line Comment");
            Console.WriteLine("  [2] Reply to a Comment");
            Console.WriteLine("  [3] Post General Discussion Message");
            Console.WriteLine("  [4] Request Changes (ChangesRequested)");
            Console.WriteLine("  [5] Approve Submission (Approved & Published)");
            Console.WriteLine("  [6] Reject Submission (Rejected)");
            Console.WriteLine("  [0] Done / Exit");
            Console.WriteLine("================================================================================");
            var rawChoice = Console.ReadLine();
            if (rawChoice == null)
            {
                return 0;
            }
            var choice = rawChoice.Trim();
            switch (choice)
            {
                case "1":
                    AddCommentPrompt(reviewId);
                    break;
                case "2":
                    ReplyCommentPrompt(reviewId, comments);
                    break;
                case "3":
                    PostMessagePrompt(reviewId);
                    break;
                case "4":
                    RequestChangesPrompt(reviewId);
                    return 0;
                case "5":
                case "a":
                case "A":
                    ApprovePrompt(reviewId, artifactName);
                    return 0;
                case "6":
                case "r":
                case "R":
                    RejectPrompt(reviewId, artifactName);
                    return 0;
                case "0":
                case "exit":
                case "quit":
                    return 0;
                default:
                    Console.WriteLine("Invalid choice.");
                    break;
            }
        }
    }

    private void AddCommentPrompt(string reviewId)
    {
        Console.WriteLine("\n--- Add File or Line Comment ---");
        Console.Write("File path (e.g. rules/security-rules.md): ");
        var filePath = Console.ReadLine()?.Trim();
        if (string.IsNullOrEmpty(filePath))
        {
            Console.WriteLine("File path is required.");
            return;
        }

        Console.Write("Line number (optional, press Enter for entire file): ");
        var lineStr = Console.ReadLine()?.Trim();
        int? lineNum = int.TryParse(lineStr, out int l) ? l : null;

        Console.Write("Comment feedback: ");
        var commentText = Console.ReadLine()?.Trim();
        if (string.IsNullOrEmpty(commentText))
        {
            Console.WriteLine("Comment cannot be empty.");
            return;
        }

        var added = _backend.AddReviewCommentAsync(reviewId, filePath, commentText, lineNum).GetAwaiter().GetResult();
        if (added != null)
        {
            Console.WriteLine($"\n✓ Comment posted successfully! (ID: {added.Id})");
        }
        else
        {
            Console.WriteLine("\nERROR: Failed to post comment.");
        }
    }

    private void ReplyCommentPrompt(string reviewId, List<ReviewCommentCliDto> comments)
    {
        if (comments.Count == 0)
        {
            Console.WriteLine("\nNo comments exist to reply to.");
            return;
        }

        Console.WriteLine("\n--- Reply to Comment ---");
        Console.Write($"Select Comment #[1-{comments.Count}] or enter Comment ID: ");
        var input = Console.ReadLine()?.Trim();
        if (string.IsNullOrEmpty(input)) return;

        string targetCommentId = input;
        if (int.TryParse(input, out int idx) && idx >= 1 && idx <= comments.Count)
        {
            targetCommentId = comments[idx - 1].Id;
        }

        Console.Write("Reply message: ");
        var replyText = Console.ReadLine()?.Trim();
        if (string.IsNullOrEmpty(replyText)) return;

        var reply = _backend.AddCommentReplyAsync(reviewId, targetCommentId, replyText).GetAwaiter().GetResult();
        if (reply != null)
        {
            Console.WriteLine($"\n✓ Reply posted successfully! (ID: {reply.Id})");
        }
        else
        {
            Console.WriteLine("\nERROR: Failed to post reply.");
        }
    }

    private void PostMessagePrompt(string reviewId)
    {
        Console.WriteLine("\n--- Post General Discussion Message ---");
        Console.Write("Message: ");
        var msg = Console.ReadLine()?.Trim();
        if (string.IsNullOrEmpty(msg)) return;

        var sent = _backend.SendThreadMessageAsync(reviewId, msg).GetAwaiter().GetResult();
        if (sent)
        {
            Console.WriteLine("\n✓ Message posted to discussion thread.");
        }
        else
        {
            Console.WriteLine("\nERROR: Failed to post message.");
        }
    }

    private void RequestChangesPrompt(string reviewId)
    {
        Console.WriteLine("\n--- Request Changes ---");
        Console.Write("Feedback / Required Changes for Producer: ");
        var feedback = Console.ReadLine()?.Trim();
        if (string.IsNullOrEmpty(feedback)) feedback = "Please address reviewer feedback.";

        var ok = _backend.RequestChangesAsync(reviewId, feedback).GetAwaiter().GetResult();
        if (ok)
        {
            Console.WriteLine($"\n✓ Submission {reviewId} status updated to CHANGES REQUESTED. Producer has been notified.");
        }
        else
        {
            Console.WriteLine("\nERROR: Failed to request changes.");
        }
    }

    private void ApprovePrompt(string reviewId, string artifactName)
    {
        Console.WriteLine("\n--- Approve Submission ---");
        Console.Write("Optional approval notes: ");
        var notes = Console.ReadLine()?.Trim();
        if (string.IsNullOrEmpty(notes)) notes = null;

        var ok = _backend.ApproveReviewAsync(reviewId, notes).GetAwaiter().GetResult();
        if (ok)
        {
            Console.WriteLine($"\n✓ SUCCESS: Submission {reviewId} APPROVED! Artifact '{artifactName}' is now published to the marketplace.");
        }
        else
        {
            Console.WriteLine("\nERROR: Failed to approve submission.");
        }
    }

    private void RejectPrompt(string reviewId, string artifactName)
    {
        Console.WriteLine("\n--- Reject Submission ---");
        Console.Write("Rejection reason / feedback: ");
        var reason = Console.ReadLine()?.Trim();
        if (string.IsNullOrEmpty(reason)) reason = "Submission rejected.";

        var ok = _backend.RejectReviewAsync(reviewId, reason).GetAwaiter().GetResult();
        if (ok)
        {
            Console.WriteLine($"\n✓ Submission {reviewId} REJECTED. Feedback delivered to producer.");
        }
        else
        {
            Console.WriteLine("\nERROR: Failed to reject submission.");
        }
    }

    private int HandleDirectComment(string[] args)
    {
        if (args.Length < 1)
        {
            Console.WriteLine("Usage: engineering-commons review comment <reviewId> --file <path> [--line <number>] --comment <text>");
            return 2;
        }

        var reviewId = args[0];
        string? filePath = null;
        int? lineNumber = null;
        string? comment = null;

        for (int i = 1; i < args.Length; i++)
        {
            if (args[i].Equals("--file", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length)
            {
                filePath = args[++i];
            }
            else if (args[i].Equals("--line", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length)
            {
                if (int.TryParse(args[++i], out int l)) lineNumber = l;
            }
            else if ((args[i].Equals("--comment", StringComparison.OrdinalIgnoreCase) || args[i].Equals("-m", StringComparison.OrdinalIgnoreCase)) && i + 1 < args.Length)
            {
                comment = args[++i];
            }
        }

        if (string.IsNullOrEmpty(filePath) || string.IsNullOrEmpty(comment))
        {
            Console.WriteLine("ERROR: Both --file and --comment are required.");
            return 1;
        }

        var res = _backend.AddReviewCommentAsync(reviewId, filePath, comment, lineNumber).GetAwaiter().GetResult();
        if (res != null)
        {
            Console.WriteLine($"✓ Comment added to {filePath}{(lineNumber.HasValue ? $" line {lineNumber}" : "")} [ID: {res.Id}]");
            return 0;
        }
        Console.WriteLine("ERROR: Failed to add comment.");
        return 1;
    }

    private int HandleDirectReply(string[] args)
    {
        if (args.Length < 2)
        {
            Console.WriteLine("Usage: engineering-commons review reply <reviewId> <commentId> --reply <text>");
            return 2;
        }

        var reviewId = args[0];
        var commentId = args[1];
        string? reply = null;

        for (int i = 2; i < args.Length; i++)
        {
            if ((args[i].Equals("--reply", StringComparison.OrdinalIgnoreCase) || args[i].Equals("-m", StringComparison.OrdinalIgnoreCase)) && i + 1 < args.Length)
            {
                reply = args[++i];
            }
        }

        if (string.IsNullOrEmpty(reply))
        {
            Console.WriteLine("ERROR: --reply text is required.");
            return 1;
        }

        var res = _backend.AddCommentReplyAsync(reviewId, commentId, reply).GetAwaiter().GetResult();
        if (res != null)
        {
            Console.WriteLine($"✓ Reply added to comment {commentId} [ID: {res.Id}]");
            return 0;
        }
        Console.WriteLine("ERROR: Failed to add reply.");
        return 1;
    }

    private int HandleDirectRequestChanges(string[] args)
    {
        if (args.Length < 1)
        {
            Console.WriteLine("Usage: engineering-commons review request-changes <reviewId> --feedback <text>");
            return 2;
        }

        var reviewId = args[0];
        string? feedback = null;

        for (int i = 1; i < args.Length; i++)
        {
            if ((args[i].Equals("--feedback", StringComparison.OrdinalIgnoreCase) || args[i].Equals("-m", StringComparison.OrdinalIgnoreCase)) && i + 1 < args.Length)
            {
                feedback = args[++i];
            }
        }

        if (string.IsNullOrEmpty(feedback)) feedback = "Please address reviewer feedback.";

        var ok = _backend.RequestChangesAsync(reviewId, feedback).GetAwaiter().GetResult();
        if (ok)
        {
            Console.WriteLine($"✓ Changes requested for review {reviewId}.");
            return 0;
        }
        Console.WriteLine("ERROR: Failed to request changes.");
        return 1;
    }

    private int HandleDirectApprove(string[] args)
    {
        if (args.Length < 1)
        {
            Console.WriteLine("Usage: engineering-commons review approve <reviewId> [--feedback <text>]");
            return 2;
        }

        var reviewId = args[0];
        string? feedback = null;

        for (int i = 1; i < args.Length; i++)
        {
            if ((args[i].Equals("--feedback", StringComparison.OrdinalIgnoreCase) || args[i].Equals("-m", StringComparison.OrdinalIgnoreCase)) && i + 1 < args.Length)
            {
                feedback = args[++i];
            }
        }

        var ok = _backend.ApproveReviewAsync(reviewId, feedback).GetAwaiter().GetResult();
        if (ok)
        {
            Console.WriteLine($"✓ Review {reviewId} approved & published.");
            return 0;
        }
        Console.WriteLine("ERROR: Failed to approve review.");
        return 1;
    }

    private int HandleDirectReject(string[] args)
    {
        if (args.Length < 1)
        {
            Console.WriteLine("Usage: engineering-commons review reject <reviewId> [--feedback <text>]");
            return 2;
        }

        var reviewId = args[0];
        string? feedback = null;

        for (int i = 1; i < args.Length; i++)
        {
            if ((args[i].Equals("--feedback", StringComparison.OrdinalIgnoreCase) || args[i].Equals("-m", StringComparison.OrdinalIgnoreCase)) && i + 1 < args.Length)
            {
                feedback = args[++i];
            }
        }

        if (string.IsNullOrEmpty(feedback)) feedback = "Submission rejected.";

        var ok = _backend.RejectReviewAsync(reviewId, feedback).GetAwaiter().GetResult();
        if (ok)
        {
            Console.WriteLine($"✓ Review {reviewId} rejected.");
            return 0;
        }
        Console.WriteLine("ERROR: Failed to reject review.");
        return 1;
    }
}
