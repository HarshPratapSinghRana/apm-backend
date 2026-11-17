// =========================================================================================
// Engineering Commons ASP.NET Core REST API Entry Point (.NET 10)
// =========================================================================================
//
// Key Responsibilities:
// 1. Environment & Secrets: Ingests configuration from .env and maps Azure DevOps / GitHub secrets.
// 2. Data Persistence: Dual-mode support (SQLite database via EF Core or decoupled In-Memory mode).
// 3. Domain Events: Dispatches asynchronous events for reviews, line comments, and approvals.
// 4. Governance & Marketplace: Connects to Azure DevOps Git repositories and SharePoint Lists.
// 5. Enterprise Security: Enforces strict HTTP security headers, CORS, and Token Authentication.
// =========================================================================================

using System;
using System.IO;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using EngineeringCommons.Backend.Extensions;
using EngineeringCommons.Backend.Services.Interfaces;
using EngineeringCommons.Backend.Services.Implementations;

// =========================================================================
// SECTION 1: Local Environment & Azure DevOps Secret Mapping
// =========================================================================
var envCandidates = new[]
{
    Path.Combine(Directory.GetCurrentDirectory(), ".env"),
    Path.Combine(Directory.GetCurrentDirectory(), "cip-backend-dotnet", ".env"),
    Path.Combine(AppContext.BaseDirectory, ".env"),
    Path.Combine(AppContext.BaseDirectory, "..", "..", "..", ".env")
};

foreach (var envPath in envCandidates)
{
    if (File.Exists(envPath))
    {
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

// =========================================================================
// SECTION 2: WebApplication Builder, JSON Converters & CORS Configuration
// =========================================================================
var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddDebug();

builder.Services.AddControllers()
    .AddNewtonsoftJson(options =>
    {
        options.SerializerSettings.Converters.Add(new Newtonsoft.Json.Converters.StringEnumConverter());
    })
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });

// Restrict CORS policies strictly to explicitly trusted origins
builder.Services.AddCors(options =>
{
    var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
        ?? new[]
        {
            "https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io",
            "https://portal.azure.com",
            "vscode-webview://",
            "http://localhost:3000",
            "http://localhost:5000",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5000"
        };

    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configuration: bind static auth options
builder.Services.Configure<StaticAuthOptions>(builder.Configuration.GetSection("StaticAuth"));

// Determine Database Persistence Mode
var useInMemory = string.Equals(Environment.GetEnvironmentVariable("ZERO_COST_MODE"), "true", StringComparison.OrdinalIgnoreCase) ||
                  string.Equals(Environment.GetEnvironmentVariable("NO_DB"), "true", StringComparison.OrdinalIgnoreCase);

var sqliteConnectionString = builder.Configuration.GetConnectionString("Sqlite") 
                             ?? builder.Configuration.GetConnectionString("DefaultConnection")
                             ?? Environment.GetEnvironmentVariable("SQLITE_CONNECTION_STRING")
                             ?? "Data Source=cip.db";

// Register all modular services using Extension Method
builder.Services.AddEngineeringCommonsServices(builder.Configuration, useInMemory, sqliteConnectionString);

var app = builder.Build();
var logger = app.Services.GetRequiredService<ILogger<Program>>();

// =========================================================================
// SECTION 3: Database Schema Verification & Migrations
// =========================================================================
app.InitializeDatabaseSchema(logger, useInMemory);

var enableSwagger = app.Environment.IsDevelopment() || 
                    string.Equals(Environment.GetEnvironmentVariable("ENABLE_SWAGGER"), "true", StringComparison.OrdinalIgnoreCase);

if (enableSwagger)
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// =========================================================================
// SECTION 4: HTTP Middleware Pipeline & Correct Execution Order
// =========================================================================
// Centralized enterprise exception handler: structured JSON
app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "[HTTP 500 ERROR] {Method} {Path}: {Message}", context.Request.Method, context.Request.Path, ex.Message);

        if (!context.Response.HasStarted)
        {
            context.Response.StatusCode = 500;
            context.Response.ContentType = "application/json";
            var isDev = app.Environment.IsDevelopment();
            var payload = System.Text.Json.JsonSerializer.Serialize(new
            {
                error = "Internal Server Error",
                message = isDev ? ex.Message : "An unexpected error occurred while processing your request."
            });
            await context.Response.WriteAsync(payload);
        }
    }
});

// Enterprise HTTP security response headers
app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    context.Response.Headers["X-XSS-Protection"] = "1; mode=block";
    context.Response.Headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
    context.Response.Headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none';";
    await next();
});

// Correct Middleware Execution Order
app.UseCors();
app.UseRouting();

// Authentication MUST be executed before Authorization
app.UseMiddleware<EngineeringCommons.Backend.Middleware.TokenAuthenticationMiddleware>();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

logger.LogInformation("Engineering Commons backend initialization complete. Ready for traffic.");

app.Run();

// Required for WebApplicationFactory in integration tests
public partial class Program { }
