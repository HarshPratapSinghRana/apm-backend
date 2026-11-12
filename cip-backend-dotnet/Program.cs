// =========================================================================================
// CIP #1067 – Engineering Commons ASP.NET Core REST API Entry Point (.NET 10)
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
using CipBackend.Services.Interfaces;
using CipBackend.Services.Implementations;

// =========================================================================
// SECTION 1: Local Environment & Azure DevOps Secret Mapping
// =========================================================================
// Load .env (if present) into environment variables so Configuration can pick them up.
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

            // Map common GitHub env var names to the configuration binder names
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
builder.Services.AddControllers()
    .AddNewtonsoftJson(options =>
    {
        options.SerializerSettings.Converters.Add(new Newtonsoft.Json.Converters.StringEnumConverter());
    })
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configuration: bind static users from appsettings
builder.Services.Configure<StaticAuthOptions>(builder.Configuration.GetSection("StaticAuth"));

// =========================================================================
// SECTION 3: Database & Persistence Layer (SQLite / In-Memory Mode)
// =========================================================================
// Determine Database Persistence Mode (Zero-Cost In-Memory or SQLite)
var useInMemory = string.Equals(Environment.GetEnvironmentVariable("ZERO_COST_MODE"), "true", StringComparison.OrdinalIgnoreCase) ||
                  string.Equals(Environment.GetEnvironmentVariable("NO_DB"), "true", StringComparison.OrdinalIgnoreCase);

var sqliteConnectionString = builder.Configuration.GetConnectionString("Sqlite") 
                             ?? builder.Configuration.GetConnectionString("DefaultConnection")
                             ?? Environment.GetEnvironmentVariable("SQLITE_CONNECTION_STRING")
                             ?? "Data Source=cip.db";

if (useInMemory)
{
    Console.WriteLine("⚡ Zero-Cost In-Memory Mode Active (Database fully decoupled).");
}
else
{
    Console.WriteLine($"🗄️ SQLite database configured ({sqliteConnectionString}).");
}

builder.Services.AddDbContext<CipBackend.Data.CipDbContext>(options =>
    options.UseSqlite(sqliteConnectionString));

// Event-driven domain event publisher & notification handlers
builder.Services.AddSingleton<CipBackend.Events.IDomainEventPublisher, CipBackend.Events.DomainEventPublisher>();
builder.Services.AddScoped<CipBackend.Events.IReviewEventHandler<CipBackend.Events.ReviewAssignedEvent>, CipBackend.Events.ReviewNotificationEventHandler>();
builder.Services.AddScoped<CipBackend.Events.IReviewEventHandler<CipBackend.Events.FeedbackAddedEvent>, CipBackend.Events.ReviewNotificationEventHandler>();
builder.Services.AddScoped<CipBackend.Events.IReviewEventHandler<CipBackend.Events.LineCommentAddedEvent>, CipBackend.Events.ReviewNotificationEventHandler>();
builder.Services.AddScoped<CipBackend.Events.IReviewEventHandler<CipBackend.Events.ProducerRepliedEvent>, CipBackend.Events.ReviewNotificationEventHandler>();
builder.Services.AddScoped<CipBackend.Events.IReviewEventHandler<CipBackend.Events.ChangesRequestedEvent>, CipBackend.Events.ReviewNotificationEventHandler>();
builder.Services.AddScoped<CipBackend.Events.IReviewEventHandler<CipBackend.Events.ResubmittedEvent>, CipBackend.Events.ReviewNotificationEventHandler>();
builder.Services.AddScoped<CipBackend.Events.IReviewEventHandler<CipBackend.Events.ReviewApprovedEvent>, CipBackend.Events.ReviewNotificationEventHandler>();
builder.Services.AddScoped<CipBackend.Events.IReviewEventHandler<CipBackend.Events.ReviewRejectedEvent>, CipBackend.Events.ReviewNotificationEventHandler>();
builder.Services.AddScoped<CipBackend.Events.IReviewEventHandler<CipBackend.Events.ReviewCancelledEvent>, CipBackend.Events.ReviewNotificationEventHandler>();

if (useInMemory)
{
    builder.Services.AddSingleton<IReviewRepository, InMemoryReviewRepository>();
    builder.Services.AddSingleton<IUsageService, InMemoryUsageService>();
    builder.Services.AddSingleton<INotificationService, InMemoryNotificationService>();
    builder.Services.AddSingleton<IUserRoleService, InMemoryUserRoleService>();
}
else
{
    builder.Services.AddSingleton<IReviewRepository, SqliteReviewRepository>();
    builder.Services.AddSingleton<IUsageService, SqliteUsageService>();
    builder.Services.AddSingleton<INotificationService, SqliteNotificationService>();
    builder.Services.AddSingleton<IUserRoleService, SqliteUserRoleService>();
}

// =========================================================================
// SECTION 4: Service Layer Dependency Injection & Background Services
// =========================================================================
// Add DI for core interfaces
builder.Services.AddSingleton<IAuthenticationService, StaticAuthenticationService>();
builder.Services.AddSingleton<ITokenService, InMemoryTokenService>();
builder.Services.AddSingleton<IArtifactClassifier, ArtifactClassifier>();
builder.Services.AddSingleton<IReviewService, ReviewService>();
builder.Services.AddHttpClient();
builder.Services.AddHttpClient("github");
builder.Services.AddHttpClient("azuredevops");
builder.Services.Configure<GitHubOptions>(builder.Configuration.GetSection("GitHub"));
builder.Services.Configure<AzureDevOpsOptions>(builder.Configuration.GetSection("AzureDevOps"));
// Use AzureDevOpsMarketplaceService to publish to and fetch from Azure DevOps (ADO) Git Repos using server-side PAT
builder.Services.AddSingleton<IMarketplaceService, CipBackend.Services.Implementations.AzureDevOpsMarketplaceService>();
builder.Services.AddSingleton<IArtifactDiffService, ArtifactDiffService>();
builder.Services.AddSingleton<IReviewThreadService, ReviewThreadService>();
builder.Services.AddSingleton<IReviewCommentService, ReviewCommentService>();
builder.Services.AddSingleton<IMicrosoftGraphEmailClient, MicrosoftGraphEmailClient>();
builder.Services.AddSingleton<IEmailNotificationService, EmailNotificationService>();
builder.Services.AddSingleton<IBountyService, BountyService>();
builder.Services.Configure<CertificationOptions>(builder.Configuration.GetSection("Certification"));
builder.Services.AddSingleton<ICertificationService, CertificationService>();
builder.Services.AddSingleton<IArtifactRecommendationService, ArtifactRecommendationService>();
builder.Services.AddHostedService<SlaMonitoringBackgroundService>();

var app = builder.Build();

// =========================================================================
// SECTION 5: Database Schema Verification, Migrations & Role Seeding
// =========================================================================
// Ensure SQLite schema created on startup (when not in decoupled in-memory mode)
if (!useInMemory)
{
    try
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CipBackend.Data.CipDbContext>();
        db.Database.EnsureCreated();

    // Ensure all required tables exist in SQLite (EnsureCreated does not create missing tables if DB file already exists)
    db.Database.ExecuteSqlRaw(@"
        CREATE TABLE IF NOT EXISTS user_access_requests (
            Id TEXT PRIMARY KEY,
            UserEmail TEXT NOT NULL,
            RequestedRole TEXT NOT NULL,
            CurrentRole TEXT NOT NULL,
            Status TEXT NOT NULL,
            Reason TEXT,
            AdminEmail TEXT,
            AdminNotes TEXT,
            RequestedAt TEXT NOT NULL,
            ReviewedAt TEXT
        );

        CREATE TABLE IF NOT EXISTS user_roles (
            UserEmail TEXT PRIMARY KEY,
            Role TEXT NOT NULL,
            IsCertifiedReviewer INTEGER NOT NULL DEFAULT 0,
            GrantedBy TEXT,
            Notes TEXT,
            GrantedAt TEXT NOT NULL,
            UpdatedAt TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS notifications (
            Id TEXT PRIMARY KEY,
            RecipientEmail TEXT NOT NULL,
            ThreadId TEXT,
            SubmissionId TEXT NOT NULL,
            ArtifactId TEXT NOT NULL DEFAULT '',
            ArtifactName TEXT NOT NULL DEFAULT '',
            ArtifactVersion TEXT NOT NULL DEFAULT '1.0.0',
            Type TEXT NOT NULL,
            Title TEXT NOT NULL,
            Message TEXT NOT NULL,
            ReferenceId TEXT,
            CreatedAt TEXT NOT NULL,
            ReadAt TEXT
        );

        CREATE TABLE IF NOT EXISTS artifact_certifications (
            Id TEXT PRIMARY KEY,
            ArtifactId TEXT NOT NULL,
            Status TEXT NOT NULL,
            CertifiedVersion TEXT NOT NULL DEFAULT '1.0.0',
            CertifiedByEmail TEXT,
            RevokedByEmail TEXT,
            RevocationReason TEXT,
            Reason TEXT,
            CriteriaJson TEXT,
            MetricsJson TEXT,
            LastEvaluatedAt TEXT NOT NULL
        );
    ");

    try { db.Database.ExecuteSqlRaw("CREATE INDEX IF NOT EXISTS IX_user_access_requests_UserEmail ON user_access_requests(UserEmail);"); } catch { }
    try { db.Database.ExecuteSqlRaw("CREATE INDEX IF NOT EXISTS IX_user_access_requests_Status ON user_access_requests(Status);"); } catch { }
    try { db.Database.ExecuteSqlRaw("CREATE INDEX IF NOT EXISTS IX_user_access_requests_RequestedAt ON user_access_requests(RequestedAt);"); } catch { }
    try { db.Database.ExecuteSqlRaw("CREATE INDEX IF NOT EXISTS IX_user_roles_Role ON user_roles(Role);"); } catch { }
    try { db.Database.ExecuteSqlRaw("CREATE INDEX IF NOT EXISTS IX_notifications_RecipientEmail ON notifications(RecipientEmail);"); } catch { }
    try { db.Database.ExecuteSqlRaw("ALTER TABLE artifact_certifications ADD COLUMN CertifiedAt TEXT;"); } catch { }
    try { db.Database.ExecuteSqlRaw("ALTER TABLE artifact_certifications ADD COLUMN RevokedAt TEXT;"); } catch { }

    // Migrate from legacy user_role_assignments if present
    try
    {
        db.Database.ExecuteSqlRaw(@"
            INSERT OR IGNORE INTO user_roles (UserEmail, Role, IsCertifiedReviewer, GrantedBy, Notes, GrantedAt, UpdatedAt)
            SELECT UserEmail, Role, IsCertifiedReviewer, GrantedBy, Notes, GrantedAt, UpdatedAt FROM user_role_assignments;
        ");
    }
    catch { }

    // Seed default role directory in user_roles table
    try
    {
        db.Database.ExecuteSqlRaw(@"
            INSERT OR IGNORE INTO user_roles (UserEmail, Role, IsCertifiedReviewer, GrantedBy, Notes, GrantedAt, UpdatedAt) VALUES
            ('harsh.rana@maqsoftware.com', 'ADMIN', 1, 'SYSTEM', 'Super Administrator with full access governance permissions', datetime('now'), datetime('now')),
            ('reviewer@company.com', 'REVIEWER', 0, 'SYSTEM', 'Reviewer with artifact review permissions', datetime('now'), datetime('now')),
            ('producer@company.com', 'PRODUCER', 0, 'SYSTEM', 'Producer with artifact publishing permissions', datetime('now'), datetime('now')),
            ('consumer@company.com', 'CONSUMER', 0, 'SYSTEM', 'Consumer with artifact search and install permissions', datetime('now'), datetime('now')),
            ('reviewer@test.com', 'REVIEWER', 0, 'SYSTEM', 'Test Reviewer', datetime('now'), datetime('now')),
            ('producer@test.com', 'PRODUCER', 0, 'SYSTEM', 'Test Producer', datetime('now'), datetime('now')),
            ('consumer@test.com', 'CONSUMER', 0, 'SYSTEM', 'Test Consumer', datetime('now'), datetime('now'));
        ");
    }
    catch { }

    // Auto-migrate new columns for existing SQLite databases
    var columns = new[]
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
        ("artifact_certifications", "MetricsJson", "TEXT")
    };

    foreach (var (table, col, colType) in columns)
    {
        try
        {
#pragma warning disable EF1002 // Table and column identifiers originate from static in-memory array above
            db.Database.ExecuteSqlRaw($"ALTER TABLE {table} ADD COLUMN {col} {colType};");
#pragma warning restore EF1002
        }
        catch { }
    }

    // Auto-migrate legacy prefixes in reviews.Content (e.g. cip-consumer-poc/, .agents/agents/)
    try
    {
        var reviewsToClean = db.Reviews.Where(r => r.Content != null && (
            r.Content.Contains("cip-consumer-poc/") ||
            r.Content.Contains(".agents/agents/") ||
            r.Content.Contains("design-reviewer/.cip/") ||
            r.Content.Contains(".cip/skills/") ||
            r.Content.Contains("cip_modules/"))).ToList();

        foreach (var rev in reviewsToClean)
        {
            if (string.IsNullOrEmpty(rev.Content)) continue;
            try
            {
                using var doc = System.Text.Json.JsonDocument.Parse(rev.Content);
                if (doc.RootElement.TryGetProperty("files", out var fProp) && fProp.ValueKind == System.Text.Json.JsonValueKind.Array)
                {
                    var cleanedFiles = new List<object>();
                    bool changed = false;
                    foreach (var f in fProp.EnumerateArray())
                    {
                        var p = f.TryGetProperty("path", out var pP) ? pP.GetString() ?? "" : "";
                        var c = f.TryGetProperty("content", out var cP) ? cP.GetString() ?? "" : "";
                        var normP = p.Replace('\\', '/');
                        var idxGh = normP.IndexOf(".github/", StringComparison.OrdinalIgnoreCase);
                        if (idxGh > 0) normP = normP.Substring(idxGh);
                        var idxAg = normP.IndexOf(".agents/skills/", StringComparison.OrdinalIgnoreCase);
                        if (idxAg > 0) normP = normP.Substring(idxAg);
                        var idxSk = normP.IndexOf("/skills/", StringComparison.OrdinalIgnoreCase);
                        if (idxSk > 0 && !normP.StartsWith(".github/") && !normP.StartsWith(".agents/")) normP = normP.Substring(idxSk + 1);
                        if (normP.StartsWith(".agents/agents/", StringComparison.OrdinalIgnoreCase)) normP = ".github/agents/" + normP.Substring(".agents/agents/".Length);

                        if (normP != p) changed = true;
                        cleanedFiles.Add(new { path = normP, content = c });
                    }

                    if (changed)
                    {
                        var updated = new Dictionary<string, object>
                        {
                            { "name", doc.RootElement.TryGetProperty("name", out var nP) ? nP.GetString() ?? rev.ArtifactId : rev.ArtifactId },
                            { "type", doc.RootElement.TryGetProperty("type", out var tP) ? tP.GetString() ?? "agent" : "agent" },
                            { "version", doc.RootElement.TryGetProperty("version", out var vP) ? vP.GetString() ?? "1.0.0" : "1.0.0" },
                            { "description", doc.RootElement.TryGetProperty("description", out var dP) ? dP.GetString() ?? "" : "" },
                            { "files", cleanedFiles }
                        };
                        rev.Content = System.Text.Json.JsonSerializer.Serialize(updated);
                    }
                }
            }
            catch { }
        }
        if (reviewsToClean.Any()) db.SaveChanges();
    }
    catch { }

    Console.WriteLine("✓ SQLite database initialized successfully (usage_events, reviews, review_threads, review_messages, artifact_certifications).");
}
    catch (Exception ex)
    {
        Console.ForegroundColor = ConsoleColor.Yellow;
        Console.WriteLine($"⚠️ Warning initializing SQLite database: {ex.Message}");
        Console.ResetColor();
    }
}

var enableSwagger = app.Environment.IsDevelopment() || 
                    string.Equals(Environment.GetEnvironmentVariable("ENABLE_SWAGGER"), "true", StringComparison.OrdinalIgnoreCase);

if (enableSwagger)
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// =========================================================================
// SECTION 6: HTTP Middleware Pipeline, Security Headers & Endpoint Mapping
// =========================================================================
// Centralized enterprise exception handler: catch unhandled errors and return structured JSON
app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch (Exception ex)
    {
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

app.UseCors();
app.UseRouting();
app.UseMiddleware<CipBackend.Middleware.TokenAuthenticationMiddleware>();
app.UseAuthorization();
app.MapControllers();

app.Run();

// Required for WebApplicationFactory in integration tests
public partial class Program { }
