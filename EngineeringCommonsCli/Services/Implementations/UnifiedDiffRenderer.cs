using EngineeringCommonsCli.Models;
using EngineeringCommonsCli.Services.Interfaces;
using System;
using System.IO;

namespace EngineeringCommonsCli.Services.Implementations;

public class UnifiedDiffRenderer : IUnifiedDiffRenderer
{
    public void RenderDiff(ArtifactDiffDto diff, TextWriter writer, bool useColor = false)
    {
        if (diff == null) return;

        bool isNewArtifact = diff.ArtifactChangeType == ArtifactChangeType.NewArtifact ||
                             (string.IsNullOrEmpty(diff.CurrentVersion) && diff.AddedFilesCount > 0 && diff.ModifiedFilesCount == 0 && diff.DeletedFilesCount == 0);

        if (isNewArtifact)
        {
            // CASE 1: COMPLETELY NEW ARTIFACT
            writer.WriteLine("┌────────────────────────────────────────────────────────────┐");
            writer.WriteLine("│ NEW ARTIFACT                                               │");
            writer.WriteLine("│                                                            │");
            writer.WriteLine($"│ {diff.ArtifactName,-58} │");
            writer.WriteLine($"│ Version: {diff.SubmittedVersion ?? "1.0.0",-50} │");
            writer.WriteLine("│                                                            │");
            writer.WriteLine("│ This is a completely new artifact.                         │");
            writer.WriteLine("│ All files are new.                                         │");
            writer.WriteLine("└────────────────────────────────────────────────────────────┘\n");

            writer.WriteLine("Files Changed\n");
            foreach (var f in diff.Files)
            {
                WriteColoredLine(writer, $"+ {f.Path,-50} ADDED", ConsoleColor.Green, useColor);
            }
        }
        else if (diff.ArtifactChangeType == ArtifactChangeType.NoChanges || diff.FilesChangedCount == 0)
        {
            // CASE 3: EXISTING ARTIFACT WITH NO CHANGES
            writer.WriteLine("--------------------------------------------------");
            writer.WriteLine("Artifact:");
            writer.WriteLine(diff.ArtifactName);
            writer.WriteLine();
            writer.WriteLine("Version:");
            writer.WriteLine(diff.CurrentVersion ?? diff.SubmittedVersion ?? "1.0.0");
            writer.WriteLine();
            writer.WriteLine("Status:");
            writer.WriteLine("NO CHANGES");
            writer.WriteLine("--------------------------------------------------");
            return;
        }
        else
        {
            // CASE 2: EXISTING ARTIFACT WITH CHANGES (MODIFIED)
            writer.WriteLine("--------------------------------------------------");
            writer.WriteLine("Artifact:");
            writer.WriteLine(diff.ArtifactName);
            writer.WriteLine();
            writer.WriteLine("Current Version:");
            writer.WriteLine(diff.CurrentVersion ?? "1.0.0");
            writer.WriteLine();
            writer.WriteLine("Submitted Version:");
            writer.WriteLine(diff.SubmittedVersion ?? "1.0.0");
            writer.WriteLine();
            writer.WriteLine("Status:");
            writer.WriteLine("MODIFIED");
            writer.WriteLine();
            writer.WriteLine("Files:");
            writer.WriteLine($"{diff.FilesChangedCount} changed");
            writer.WriteLine($"{diff.AddedFilesCount} added");
            writer.WriteLine($"{diff.ModifiedFilesCount} modified");
            writer.WriteLine($"{diff.DeletedFilesCount} deleted");
            writer.WriteLine("--------------------------------------------------\n");

            writer.WriteLine("Files Changed\n");
            foreach (var f in diff.Files)
            {
                var symbol = f.ChangeType switch
                {
                    ChangeType.Added => "+",
                    ChangeType.Deleted => "-",
                    ChangeType.Modified => "~",
                    _ => " "
                };
                var statusText = f.ChangeType switch
                {
                    ChangeType.Added => "ADDED",
                    ChangeType.Deleted => "DELETED",
                    ChangeType.Modified => "MODIFIED",
                    _ => "UNCHANGED"
                };

                var color = f.ChangeType switch
                {
                    ChangeType.Added => ConsoleColor.Green,
                    ChangeType.Deleted => ConsoleColor.Red,
                    ChangeType.Modified => ConsoleColor.Yellow,
                    _ => ConsoleColor.DarkGray
                };

                WriteColoredLine(writer, $"{symbol} {f.Path,-50} {statusText}", color, useColor);
            }
        }

        // UNIFIED LINE-LEVEL DIFFS FOR EACH FILE
        foreach (var f in diff.Files)
        {
            writer.WriteLine("\n--------------------------------------------------");
            var statusLabel = f.ChangeType switch
            {
                ChangeType.Added => "(ADDED)",
                ChangeType.Deleted => "(DELETED)",
                ChangeType.Modified => "(MODIFIED)",
                _ => "(UNCHANGED)"
            };
            writer.WriteLine($"{f.Path} {statusLabel}");
            writer.WriteLine("--------------------------------------------------");

            if (f.LineChanges == null || f.LineChanges.Count == 0)
            {
                writer.WriteLine("  (No line changes)");
                continue;
            }

            foreach (var line in f.LineChanges)
            {
                if (line.Type == LineChangeType.Added)
                {
                    var lineNum = line.NewLineNumber.HasValue ? line.NewLineNumber.Value.ToString().PadLeft(3) : "   ";
                    WriteColoredLine(writer, $"+ {lineNum}  {line.Content}", ConsoleColor.Green, useColor);
                }
                else if (line.Type == LineChangeType.Deleted)
                {
                    var lineNum = line.OldLineNumber.HasValue ? line.OldLineNumber.Value.ToString().PadLeft(3) : "   ";
                    WriteColoredLine(writer, $"- {lineNum}  {line.Content}", ConsoleColor.Red, useColor);
                }
                else
                {
                    var lineNum = (line.NewLineNumber ?? line.OldLineNumber)?.ToString().PadLeft(3) ?? "   ";
                    WriteColoredLine(writer, $"  {lineNum}  {line.Content}", ConsoleColor.White, useColor);
                }
            }
        }
    }

    private static void WriteColoredLine(TextWriter writer, string text, ConsoleColor color, bool useColor)
    {
        if (useColor && writer == Console.Out && !Console.IsOutputRedirected)
        {
            try
            {
                var prev = Console.ForegroundColor;
                Console.ForegroundColor = color;
                writer.WriteLine(text);
                Console.ForegroundColor = prev;
                return;
            }
            catch { }
        }
        writer.WriteLine(text);
    }
}
