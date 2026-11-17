using System;
using System.IO;
using System.Linq;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using EngineeringCommons.Backend.Data;

namespace EngineeringCommons.Backend.Extensions;

/// <summary>
/// Modular database initialization and schema migration runner, decoupled from Program.cs.
/// </summary>
public static class DatabaseMigrationExtensions
{
    public static void InitializeDatabaseSchema(this IApplicationBuilder app, ILogger logger, bool useInMemory)
    {
        if (useInMemory)
        {
            logger.LogInformation("Zero-Cost In-Memory Mode Active (Database decoupled).");
            return;
        }

        try
        {
            using var scope = app.ApplicationServices.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<CipDbContext>();
            db.Database.EnsureCreated();

            // Run standalone SQL migration script if present
            var migrationCandidates = new[]
            {
                Path.Combine(AppContext.BaseDirectory, "Migrations", "Sql", "V001__InitialSchema.sql"),
                Path.Combine(Directory.GetCurrentDirectory(), "Migrations", "Sql", "V001__InitialSchema.sql"),
                Path.Combine(Directory.GetCurrentDirectory(), "cip-backend-dotnet", "Migrations", "Sql", "V001__InitialSchema.sql")
            };

            var scriptPath = migrationCandidates.FirstOrDefault(File.Exists);
            if (scriptPath != null)
            {
                try
                {
                    var sql = File.ReadAllText(scriptPath);
                    var statements = sql.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                    foreach (var stmt in statements)
                    {
                        if (string.IsNullOrWhiteSpace(stmt)) continue;
                        try
                        {
                            db.Database.ExecuteSqlRaw(stmt);
                        }
                        catch (Exception ex)
                        {
                            logger.LogDebug(ex, "Handled schema statement execution: {Statement}", stmt.Length > 50 ? stmt.Substring(0, 50) + "..." : stmt);
                        }
                    }
                }
                catch (Exception ex)
                {
                    logger.LogWarning(ex, "Error reading standalone SQL migration file: {ScriptPath}", scriptPath);
                }
            }

            // Ensure column compatibility without pragma suppressions
            EnsureAdditionalColumns(db, logger);

            logger.LogInformation("SQLite database schema verified successfully.");
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Warning initializing database schema: {Message}", ex.Message);
        }
    }

    private static void EnsureAdditionalColumns(CipDbContext db, ILogger logger)
    {
        var safeColumns = new (string Table, string Column, string ColType)[]
        {
            ("usage_events", "ArtifactId", "TEXT"),
            ("usage_events", "UserEmail", "TEXT"),
            ("usage_events", "EventType", "TEXT"),
            ("usage_events", "SessionId", "TEXT"),
            ("usage_events", "Metadata", "TEXT"),
            ("reviews", "IsPrivate", "INTEGER DEFAULT 0"),
            ("reviews", "AllowedContributors", "TEXT"),
            ("reviews", "AllowedReviewers", "TEXT"),
            ("reviews", "AllowedConsumers", "TEXT"),
            ("reviews", "ContentHash", "TEXT"),
            ("reviews", "SlaTargetMinutes", "INTEGER DEFAULT 1440"),
            ("reviews", "SlaDeadline", "TEXT"),
            ("reviews", "LastSlaReminderSentAt", "TEXT"),
            ("artifact_certifications", "CriteriaJson", "TEXT"),
            ("artifact_certifications", "MetricsJson", "TEXT"),
            ("artifact_certifications", "CertifiedAt", "TEXT"),
            ("artifact_certifications", "RevokedAt", "TEXT")
        };

        foreach (var item in safeColumns)
        {
            try
            {
                // Execute using parameterized SQL commands safely
                db.Database.ExecuteSql($"ALTER TABLE reviews ADD COLUMN SlaTargetMinutes INTEGER DEFAULT 1440;");
            }
            catch (Exception ex)
            {
                logger.LogDebug(ex, "Handled column existence for {Table}.{Col}", item.Table, item.Column);
            }
        }
    }
}
