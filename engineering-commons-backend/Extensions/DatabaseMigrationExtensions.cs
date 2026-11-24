using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Microsoft.AspNetCore.Builder;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using EngineeringCommons.Backend.Data;

namespace EngineeringCommons.Backend.Extensions;

/// <summary>
/// Modular database initialization and schema migration runner, decoupled from Program.cs.
/// Supports both forward migrations and rollback operations for CI/CD pipelines.
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

        logger.LogInformation("Database migrations are decoupled from application startup. Run scripts/Run-DatabaseMigrations.ps1 or 'dotnet run -- --migrate' in CI/CD pipeline.");
    }

    /// <summary>
    /// Explicitly executes forward SQL schema migrations (V001, V002, etc.) against target database.
    /// Tracks applied versions in __MigrationHistory to avoid duplicate execution.
    /// </summary>
    public static int ApplyMigrations(string dbPath, string migrationsDir, ILogger? logger = null)
    {
        var fullDbPath = Path.GetFullPath(dbPath);
        var fullDir = Path.GetFullPath(migrationsDir);

        if (!Directory.Exists(fullDir))
        {
            logger?.LogError("Migrations directory not found: {Dir}", fullDir);
            return 1;
        }

        logger?.LogInformation("[ApplyMigrations] Target: {Target}", fullDbPath);
        logger?.LogInformation("[ApplyMigrations] Source: {Source}", fullDir);

        var connStr = $"Data Source={fullDbPath}";
        using var conn = new SqliteConnection(connStr);
        conn.Open();

        // 1. Ensure __MigrationHistory exists
        using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = "CREATE TABLE IF NOT EXISTS __MigrationHistory (MigrationId TEXT PRIMARY KEY, AppliedAt TEXT);";
            cmd.ExecuteNonQuery();
        }

        // 2. Query applied migrations
        var applied = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = "SELECT MigrationId FROM __MigrationHistory;";
            using var reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                applied.Add(reader.GetString(0));
            }
        }

        // 3. Find and apply pending migrations
        var files = Directory.GetFiles(fullDir, "V*__*.sql").OrderBy(f => Path.GetFileName(f)).ToList();
        int appliedCount = 0;

        foreach (var file in files)
        {
            var migrationId = Path.GetFileNameWithoutExtension(file);
            if (applied.Contains(migrationId))
            {
                logger?.LogDebug("  [SKIP] Migration {MigrationId} already applied.", migrationId);
                continue;
            }

            logger?.LogInformation("  --> Applying migration: {FileName}...", Path.GetFileName(file));
            var sql = File.ReadAllText(file);
            using var trans = conn.BeginTransaction();
            try
            {
                var statements = sql.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                foreach (var stmt in statements)
                {
                    if (string.IsNullOrWhiteSpace(stmt)) continue;
                    using var cmd = conn.CreateCommand();
                    cmd.Transaction = trans;
                    cmd.CommandText = stmt;
                    cmd.ExecuteNonQuery();
                }

                using var histCmd = conn.CreateCommand();
                histCmd.Transaction = trans;
                histCmd.CommandText = "INSERT INTO __MigrationHistory (MigrationId, AppliedAt) VALUES (@id, @at);";
                histCmd.Parameters.AddWithValue("@id", migrationId);
                histCmd.Parameters.AddWithValue("@at", DateTime.UtcNow.ToString("o"));
                histCmd.ExecuteNonQuery();

                trans.Commit();
                appliedCount++;
                logger?.LogInformation("  ✓ Successfully applied {MigrationId}", migrationId);
            }
            catch (Exception ex)
            {
                trans.Rollback();
                logger?.LogError(ex, "Failed applying migration {MigrationId}: {Message}", migrationId, ex.Message);
                return 1;
            }
        }

        logger?.LogInformation("✓ Applied {Count} pending migrations.", appliedCount);
        return 0;
    }

    /// <summary>
    /// Explicitly executes rollback SQL schema migrations (U002, U001, etc.) against target database in reverse order.
    /// Updates __MigrationHistory table accordingly.
    /// </summary>
    public static int RollbackMigrations(string dbPath, string migrationsDir, ILogger? logger = null)
    {
        var fullDbPath = Path.GetFullPath(dbPath);
        var fullDir = Path.GetFullPath(migrationsDir);

        if (!Directory.Exists(fullDir))
        {
            logger?.LogError("Migrations directory not found: {Dir}", fullDir);
            return 1;
        }

        logger?.LogInformation("[RollbackMigrations] Target: {Target}", fullDbPath);
        logger?.LogInformation("[RollbackMigrations] Source: {Source}", fullDir);

        var connStr = $"Data Source={fullDbPath}";
        using var conn = new SqliteConnection(connStr);
        conn.Open();

        var files = Directory.GetFiles(fullDir, "U*__*.sql").OrderByDescending(f => Path.GetFileName(f)).ToList();
        int rollbackCount = 0;

        foreach (var file in files)
        {
            var rollbackId = Path.GetFileNameWithoutExtension(file);
            var forwardId = rollbackId.Replace("U", "V");

            logger?.LogInformation("  <-- Rolling back: {FileName}...", Path.GetFileName(file));
            var sql = File.ReadAllText(file);
            using var trans = conn.BeginTransaction();
            try
            {
                var statements = sql.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                foreach (var stmt in statements)
                {
                    if (string.IsNullOrWhiteSpace(stmt)) continue;
                    using var cmd = conn.CreateCommand();
                    cmd.Transaction = trans;
                    cmd.CommandText = stmt;
                    cmd.ExecuteNonQuery();
                }

                using var histCmd = conn.CreateCommand();
                histCmd.Transaction = trans;
                histCmd.CommandText = "DELETE FROM __MigrationHistory WHERE MigrationId LIKE @prefix;";
                histCmd.Parameters.AddWithValue("@prefix", forwardId.Substring(0, Math.Min(4, forwardId.Length)) + "%");
                histCmd.ExecuteNonQuery();

                trans.Commit();
                rollbackCount++;
                logger?.LogInformation("  ✓ Successfully reverted {RollbackId}", rollbackId);
            }
            catch (Exception ex)
            {
                trans.Rollback();
                logger?.LogError(ex, "Failed rolling back {RollbackId}: {Message}", rollbackId, ex.Message);
                return 1;
            }
        }

        logger?.LogInformation("✓ Reverted {Count} migrations.", rollbackCount);
        return 0;
    }
}
