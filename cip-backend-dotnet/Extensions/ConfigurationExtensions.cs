using System;
using System.IO;
using Microsoft.Extensions.Configuration;

namespace EngineeringCommons.Backend.Extensions;

/// <summary>
/// Modular configuration and environment extensions decoupled from Program.cs.
/// Maps local development .env files and normalizes Azure DevOps / GitHub environment secrets.
/// </summary>
public static class EngineeringCommonsConfigurationExtensions
{
    public static void IngestEnvironmentAndSecrets()
    {
        var envCandidates = new[]
        {
            Path.Combine(Directory.GetCurrentDirectory(), ".env"),
            Path.Combine(Directory.GetCurrentDirectory(), "cip-backend-dotnet", ".env"),
            Path.Combine(AppContext.BaseDirectory, ".env"),
            Path.Combine(AppContext.BaseDirectory, "..", "..", "..", ".env")
        };

        foreach (var envPath in envCandidates)
        {
            if (!File.Exists(envPath)) continue;

            foreach (var raw in File.ReadAllLines(envPath))
            {
                var line = raw?.Trim();
                if (string.IsNullOrEmpty(line) || line.StartsWith("#")) continue;
                var idx = line.IndexOf('=');
                if (idx <= 0) continue;
                var key = line.Substring(0, idx).Trim();
                var val = line.Substring(idx + 1).Trim().Trim('"', '\'').Trim();
                Environment.SetEnvironmentVariable(key, val);

                // Map Azure DevOps (ADO) env var names to configuration binder names
                if (string.Equals(key, "AZURE_DEVOPS_TOKEN", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(key, "AZURE_DEVOPS_PAT", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(key, "ADO_TOKEN", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(key, "ADO_PAT", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(key, "AZURE_DEVOPS__TOKEN", StringComparison.OrdinalIgnoreCase))
                {
                    Environment.SetEnvironmentVariable("AzureDevOps:Token", val);
                    Environment.SetEnvironmentVariable("AzureDevOps__Token", val);
                }
                if (string.Equals(key, "AZURE_DEVOPS_ORG", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(key, "AZURE_DEVOPS_ORGANIZATION", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(key, "ADO_ORG", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(key, "AZURE_DEVOPS__ORGANIZATION", StringComparison.OrdinalIgnoreCase))
                {
                    Environment.SetEnvironmentVariable("AzureDevOps:Organization", val);
                    Environment.SetEnvironmentVariable("AzureDevOps__Organization", val);
                }
                if (string.Equals(key, "AZURE_DEVOPS_PROJECT", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(key, "ADO_PROJECT", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(key, "AZURE_DEVOPS__PROJECT", StringComparison.OrdinalIgnoreCase))
                {
                    Environment.SetEnvironmentVariable("AzureDevOps:Project", val);
                    Environment.SetEnvironmentVariable("AzureDevOps__Project", val);
                }
                if (string.Equals(key, "AZURE_DEVOPS_REPOSITORY", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(key, "AZURE_DEVOPS_REPO", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(key, "ADO_REPO", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(key, "AZURE_DEVOPS__REPOSITORY", StringComparison.OrdinalIgnoreCase))
                {
                    Environment.SetEnvironmentVariable("AzureDevOps:Repository", val);
                    Environment.SetEnvironmentVariable("AzureDevOps__Repository", val);
                }
                if (string.Equals(key, "AZURE_DEVOPS_BRANCH", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(key, "ADO_BRANCH", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(key, "AZURE_DEVOPS__BRANCH", StringComparison.OrdinalIgnoreCase))
                {
                    Environment.SetEnvironmentVariable("AzureDevOps:Branch", val);
                    Environment.SetEnvironmentVariable("AzureDevOps__Branch", val);
                }

                // Map common GitHub env var names to configuration binder names
                if (string.Equals(key, "GITHUB_TOKEN", StringComparison.OrdinalIgnoreCase) || 
                    string.Equals(key, "GITHUB__TOKEN", StringComparison.OrdinalIgnoreCase) || 
                    string.Equals(key, "GITHUB_PAT", StringComparison.OrdinalIgnoreCase))
                {
                    Environment.SetEnvironmentVariable("GitHub:Token", val);
                    Environment.SetEnvironmentVariable("GitHub__Token", val);
                }
                if (string.Equals(key, "GITHUB_OWNER", StringComparison.OrdinalIgnoreCase) || 
                    string.Equals(key, "GITHUB__OWNER", StringComparison.OrdinalIgnoreCase) || 
                    string.Equals(key, "GITHUB_USER", StringComparison.OrdinalIgnoreCase))
                {
                    Environment.SetEnvironmentVariable("GitHub:Owner", val);
                    Environment.SetEnvironmentVariable("GitHub__Owner", val);
                }
                if (string.Equals(key, "GITHUB_REPOSITORY", StringComparison.OrdinalIgnoreCase) || 
                    string.Equals(key, "GITHUB__REPOSITORY", StringComparison.OrdinalIgnoreCase) || 
                    string.Equals(key, "GITHUB_REPO", StringComparison.OrdinalIgnoreCase))
                {
                    Environment.SetEnvironmentVariable("GitHub:Repository", val);
                    Environment.SetEnvironmentVariable("GitHub__Repository", val);
                }
                if (string.Equals(key, "SQLITE_CONNECTION_STRING", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(key, "DATABASE_URL", StringComparison.OrdinalIgnoreCase))
                {
                    Environment.SetEnvironmentVariable("ConnectionStrings:Sqlite", val);
                    Environment.SetEnvironmentVariable("ConnectionStrings__Sqlite", val);
                }
            }
        }
    }
}
