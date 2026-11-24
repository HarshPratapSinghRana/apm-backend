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
using System.Linq;
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
// SECTION 1: Local Environment & Azure DevOps Secret Ingestion
// =========================================================================
EngineeringCommonsConfigurationExtensions.IngestEnvironmentAndSecrets();

// =========================================================================
// SECTION 2: Decoupled Standalone Database Migration Execution CLI Command
// =========================================================================
if (args.Contains("--migrate") || args.Contains("migrate"))
{
    var dbPath = "engineering-commons.db";
    var migDir = Path.Combine(AppContext.BaseDirectory, "Migrations", "Sql");
    if (!Directory.Exists(migDir)) migDir = Path.Combine(Directory.GetCurrentDirectory(), "engineering-commons-backend", "Migrations", "Sql");
    if (!Directory.Exists(migDir)) migDir = Path.Combine(Directory.GetCurrentDirectory(), "Migrations", "Sql");
    
    for (int i = 0; i < args.Length; i++)
    {
        if (args[i] == "--db" && i + 1 < args.Length) dbPath = args[i + 1];
        if (args[i] == "--dir" && i + 1 < args.Length) migDir = args[i + 1];
    }

    return DatabaseMigrationExtensions.ApplyMigrations(dbPath, migDir);
}

if (args.Contains("--rollback") || args.Contains("rollback"))
{
    var dbPath = "engineering-commons.db";
    var migDir = Path.Combine(AppContext.BaseDirectory, "Migrations", "Sql");
    if (!Directory.Exists(migDir)) migDir = Path.Combine(Directory.GetCurrentDirectory(), "engineering-commons-backend", "Migrations", "Sql");
    if (!Directory.Exists(migDir)) migDir = Path.Combine(Directory.GetCurrentDirectory(), "Migrations", "Sql");
    
    for (int i = 0; i < args.Length; i++)
    {
        if (args[i] == "--db" && i + 1 < args.Length) dbPath = args[i + 1];
        if (args[i] == "--dir" && i + 1 < args.Length) migDir = args[i + 1];
    }

    return DatabaseMigrationExtensions.RollbackMigrations(dbPath, migDir);
}

// =========================================================================
// SECTION 3: WebApplication Builder, Services & Pipeline Configuration
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

// Whitelisted CORS policies
builder.Services.AddEngineeringCommonsCors(builder.Configuration);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Authentication & Token Handler
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = "Token";
    options.DefaultChallengeScheme = "Token";
})
.AddScheme<Microsoft.AspNetCore.Authentication.AuthenticationSchemeOptions, EngineeringCommons.Backend.Middleware.TokenAuthenticationHandler>("Token", null);

// Declarative App Role Authorization Policies
builder.Services.AddEngineeringCommonsAuthorizationPolicies();

// Configuration: bind static auth options
builder.Services.Configure<StaticAuthOptions>(builder.Configuration.GetSection("StaticAuth"));

// Determine Database Persistence Mode
var useInMemory = string.Equals(Environment.GetEnvironmentVariable("ZERO_COST_MODE"), "true", StringComparison.OrdinalIgnoreCase) ||
                  string.Equals(Environment.GetEnvironmentVariable("NO_DB"), "true", StringComparison.OrdinalIgnoreCase);

var sqliteConnectionString = builder.Configuration.GetConnectionString("EngineeringCommons")
                             ?? builder.Configuration.GetConnectionString("Sqlite") 
                             ?? builder.Configuration.GetConnectionString("DefaultConnection")
                             ?? Environment.GetEnvironmentVariable("SQLITE_CONNECTION_STRING")
                             ?? "Data Source=engineering-commons.db";

// Register all modular services using Extension Method
builder.Services.AddEngineeringCommonsServices(builder.Configuration, useInMemory, sqliteConnectionString);

var app = builder.Build();
var logger = app.Services.GetRequiredService<ILogger<Program>>();

// Database Schema Initialization (Decoupled in production)
app.InitializeDatabaseSchema(logger, useInMemory);

var enableSwagger = app.Environment.IsDevelopment() || 
                    string.Equals(Environment.GetEnvironmentVariable("ENABLE_SWAGGER"), "true", StringComparison.OrdinalIgnoreCase);

if (enableSwagger)
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// =========================================================================
// SECTION 4: HTTP Middleware Pipeline (Standard Canonical Execution Order)
// =========================================================================
app.UseGlobalExceptionHandler(logger, app.Environment);
app.UseEnterpriseSecurityHeaders();
app.UseEngineeringCommonsPipeline();

app.MapControllers();

logger.LogInformation("Engineering Commons backend initialization complete. Ready for traffic.");

app.Run();

return 0;

// Required for WebApplicationFactory in integration tests
public partial class Program { }
