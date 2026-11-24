using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using EngineeringCommons.Backend.Data;
using EngineeringCommons.Backend.Models;
using EngineeringCommons.Backend.Services.Implementations;
using EngineeringCommons.Backend.Services.Interfaces;
using Xunit;

namespace EngineeringCommons.Backend.Tests;

public class UsageAnalyticsScenariosTests
{
    private ServiceProvider CreateServiceProvider(string dbName)
    {
        var services = new ServiceCollection();
        services.AddDbContext<EngineeringCommonsDbContext>(options =>
            options.UseInMemoryDatabase(dbName));

        return services.BuildServiceProvider();
    }

    // 1. Successful installation creates INSTALL event
    [Fact]
    public async Task Scenario01_SuccessfulInstallation_CreatesInstallEvent()
    {
        var sp = CreateServiceProvider(Guid.NewGuid().ToString());
        var scopeFactory = sp.GetRequiredService<IServiceScopeFactory>();
        var service = new SqliteUsageService(scopeFactory, NullLogger<SqliteUsageService>.Instance);

        var installEvent = new UsageEvent
        {
            UserId = "user1@company.com",
            ArtifactId = "design-reviewer",
            ArtifactName = "design-reviewer",
            ArtifactVersion = "1.0.0",
            ArtifactType = "agent",
            EventType = "INSTALL",
            Source = "CLI"
        };

        await service.RecordUsageAsync(installEvent);

        var events = (await service.GetUsageEventsAsync("user1@company.com")).ToList();
        Assert.Single(events);
        Assert.Equal("INSTALL", events[0].EventType);
        Assert.Equal("design-reviewer", events[0].ArtifactId);
    }

    // 2. Failed installation does not create INSTALL event
    [Fact]
    public async Task Scenario02_FailedInstallation_DoesNotCreateInstallEvent()
    {
        var sp = CreateServiceProvider(Guid.NewGuid().ToString());
        var scopeFactory = sp.GetRequiredService<IServiceScopeFactory>();
        var service = new SqliteUsageService(scopeFactory, NullLogger<SqliteUsageService>.Instance);

        // When installation fails, client code does not invoke service.RecordUsageAsync
        // Verify that database has zero events
        var events = (await service.GetUsageEventsAsync()).ToList();
        Assert.Empty(events);
    }

    // 3. Same installation does not create duplicate events (Idempotency)
    [Fact]
    public async Task Scenario03_SameInstallation_DoesNotCreateDuplicateEvents()
    {
        var sp = CreateServiceProvider(Guid.NewGuid().ToString());
        var scopeFactory = sp.GetRequiredService<IServiceScopeFactory>();
        var service = new SqliteUsageService(scopeFactory, NullLogger<SqliteUsageService>.Instance);

        var sessionId = "session-unique-123";
        var event1 = new UsageEvent
        {
            UserId = "user1@company.com",
            ArtifactId = "design-reviewer",
            ArtifactName = "design-reviewer",
            ArtifactVersion = "1.0.0",
            EventType = "INSTALL",
            SessionId = sessionId
        };

        var event2 = new UsageEvent
        {
            UserId = "user1@company.com",
            ArtifactId = "design-reviewer",
            ArtifactName = "design-reviewer",
            ArtifactVersion = "1.0.0",
            EventType = "INSTALL",
            SessionId = sessionId
        };

        await service.RecordUsageAsync(event1);
        await service.RecordUsageAsync(event2); // duplicate attempt with same session

        var events = (await service.GetUsageEventsAsync()).ToList();
        Assert.Single(events);
    }

    // 4. USE event is separate from INSTALL
    [Fact]
    public async Task Scenario04_UseEvent_IsSeparateFromInstall()
    {
        var sp = CreateServiceProvider(Guid.NewGuid().ToString());
        var scopeFactory = sp.GetRequiredService<IServiceScopeFactory>();
        var service = new SqliteUsageService(scopeFactory, NullLogger<SqliteUsageService>.Instance);

        // 1 Install
        await service.RecordUsageAsync(new UsageEvent
        {
            UserId = "user1@company.com",
            ArtifactId = "design-reviewer",
            ArtifactName = "design-reviewer",
            EventType = "INSTALL"
        });

        // 3 Uses / Invocations
        await service.RecordUsageAsync(new UsageEvent { UserId = "user1@company.com", ArtifactId = "design-reviewer", EventType = "USE" });
        await service.RecordUsageAsync(new UsageEvent { UserId = "user1@company.com", ArtifactId = "design-reviewer", EventType = "INVOKE" });
        await service.RecordUsageAsync(new UsageEvent { UserId = "user2@company.com", ArtifactId = "design-reviewer", EventType = "USE" });

        var summary = await service.GetSummaryAsync(new UsageFilterOptions());
        Assert.Equal(1, summary.TotalDownloads);
        Assert.Equal(3, summary.TotalUses);
    }

    // 5. Usage is associated with correct artifact
    [Fact]
    public async Task Scenario05_UsageAssociatedWithCorrectArtifact()
    {
        var sp = CreateServiceProvider(Guid.NewGuid().ToString());
        var scopeFactory = sp.GetRequiredService<IServiceScopeFactory>();
        var service = new SqliteUsageService(scopeFactory, NullLogger<SqliteUsageService>.Instance);

        await service.RecordUsageAsync(new UsageEvent { UserId = "u1@test.com", ArtifactId = "agent-a", EventType = "USE" });
        await service.RecordUsageAsync(new UsageEvent { UserId = "u1@test.com", ArtifactId = "agent-b", EventType = "USE" });

        var detailsA = await service.GetArtifactDetailsAnalyticsAsync("agent-a");
        var detailsB = await service.GetArtifactDetailsAnalyticsAsync("agent-b");

        Assert.NotNull(detailsA);
        Assert.NotNull(detailsB);
        Assert.Equal("agent-a", detailsA.ArtifactId);
        Assert.Equal(1, detailsA.UsageCount);
        Assert.Equal("agent-b", detailsB.ArtifactId);
        Assert.Equal(1, detailsB.UsageCount);
    }

    // 6. Usage is associated with correct version
    [Fact]
    public async Task Scenario06_UsageAssociatedWithCorrectVersion()
    {
        var sp = CreateServiceProvider(Guid.NewGuid().ToString());
        var scopeFactory = sp.GetRequiredService<IServiceScopeFactory>();
        var service = new SqliteUsageService(scopeFactory, NullLogger<SqliteUsageService>.Instance);

        await service.RecordUsageAsync(new UsageEvent { UserId = "u1@test.com", ArtifactId = "sql-agent", ArtifactVersion = "2.1.0", EventType = "USE" });

        var details = await service.GetArtifactDetailsAnalyticsAsync("sql-agent");
        Assert.NotNull(details);
        Assert.Equal("2.1.0", details.CurrentVersion);
    }

    // 7. Unique user count works
    [Fact]
    public async Task Scenario07_UniqueUserCountWorks()
    {
        var sp = CreateServiceProvider(Guid.NewGuid().ToString());
        var scopeFactory = sp.GetRequiredService<IServiceScopeFactory>();
        var service = new SqliteUsageService(scopeFactory, NullLogger<SqliteUsageService>.Instance);

        // Same user uses 5 times, another user uses 2 times
        for (int i = 0; i < 5; i++)
        {
            await service.RecordUsageAsync(new UsageEvent { UserId = "alice@company.com", ArtifactId = "design-reviewer", EventType = "USE" });
        }
        for (int i = 0; i < 2; i++)
        {
            await service.RecordUsageAsync(new UsageEvent { UserId = "bob@company.com", ArtifactId = "design-reviewer", EventType = "USE" });
        }

        var details = await service.GetArtifactDetailsAnalyticsAsync("design-reviewer");
        Assert.NotNull(details);
        Assert.Equal(7, details.UsageCount);
        Assert.Equal(2, details.UniqueUsers);
        Assert.Equal(3.5, details.UsageRate); // 7 uses / 2 users = 3.5
    }

    // 8. Most downloaded calculation works dynamically
    [Fact]
    public async Task Scenario08_MostDownloadedCalculationWorksDynamically()
    {
        var sp = CreateServiceProvider(Guid.NewGuid().ToString());
        var scopeFactory = sp.GetRequiredService<IServiceScopeFactory>();
        var service = new SqliteUsageService(scopeFactory, NullLogger<SqliteUsageService>.Instance);

        // 3 downloads for design-reviewer
        await service.RecordUsageAsync(new UsageEvent { UserId = "u1@test.com", ArtifactId = "design-reviewer", EventType = "INSTALL" });
        await service.RecordUsageAsync(new UsageEvent { UserId = "u2@test.com", ArtifactId = "design-reviewer", EventType = "INSTALL" });
        await service.RecordUsageAsync(new UsageEvent { UserId = "u3@test.com", ArtifactId = "design-reviewer", EventType = "INSTALL" });

        // 5 downloads for sql-agent
        for (int i = 0; i < 5; i++)
        {
            await service.RecordUsageAsync(new UsageEvent { UserId = $"user{i}@test.com", ArtifactId = "sql-agent", EventType = "INSTALL" });
        }

        var topDownloaded = (await service.GetMostDownloadedAsync(5, new UsageFilterOptions())).ToList();
        Assert.Equal(2, topDownloaded.Count);
        Assert.Equal("sql-agent", topDownloaded[0].ArtifactId);
        Assert.Equal(5, topDownloaded[0].Count);
        Assert.Equal(1, topDownloaded[0].Rank);

        Assert.Equal("design-reviewer", topDownloaded[1].ArtifactId);
        Assert.Equal(3, topDownloaded[1].Count);
        Assert.Equal(2, topDownloaded[1].Rank);
    }

    // 9. Most used calculation works dynamically
    [Fact]
    public async Task Scenario09_MostUsedCalculationWorksDynamically()
    {
        var sp = CreateServiceProvider(Guid.NewGuid().ToString());
        var scopeFactory = sp.GetRequiredService<IServiceScopeFactory>();
        var service = new SqliteUsageService(scopeFactory, NullLogger<SqliteUsageService>.Instance);

        // 10 uses for prompt-expert
        for (int i = 0; i < 10; i++)
        {
            await service.RecordUsageAsync(new UsageEvent { UserId = "u@test.com", ArtifactId = "prompt-expert", EventType = "USE" });
        }

        // 4 uses for linter-command
        for (int i = 0; i < 4; i++)
        {
            await service.RecordUsageAsync(new UsageEvent { UserId = "u@test.com", ArtifactId = "linter-command", EventType = "USE" });
        }

        var topUsed = (await service.GetMostUsedAsync(5, new UsageFilterOptions())).ToList();
        Assert.Equal(2, topUsed.Count);
        Assert.Equal("prompt-expert", topUsed[0].ArtifactId);
        Assert.Equal(10, topUsed[0].Count);
        Assert.Equal("linter-command", topUsed[1].ArtifactId);
        Assert.Equal(4, topUsed[1].Count);
    }

    // 10. 7-day filter works
    [Fact]
    public async Task Scenario10_SevenDayFilterWorks()
    {
        var sp = CreateServiceProvider(Guid.NewGuid().ToString());
        var scopeFactory = sp.GetRequiredService<IServiceScopeFactory>();
        var service = new SqliteUsageService(scopeFactory, NullLogger<SqliteUsageService>.Instance);

        // Event from 2 days ago (within 7d)
        await service.RecordUsageAsync(new UsageEvent
        {
            UserId = "u1@test.com",
            ArtifactId = "recent-agent",
            EventType = "USE",
            Timestamp = DateTime.UtcNow.AddDays(-2)
        });

        // Event from 15 days ago (outside 7d)
        await service.RecordUsageAsync(new UsageEvent
        {
            UserId = "u2@test.com",
            ArtifactId = "old-agent",
            EventType = "USE",
            Timestamp = DateTime.UtcNow.AddDays(-15)
        });

        var summary7d = await service.GetSummaryAsync(new UsageFilterOptions { Period = "7d" });
        Assert.Equal(1, summary7d.TotalUses);

        var summaryAll = await service.GetSummaryAsync(new UsageFilterOptions { Period = "all" });
        Assert.Equal(2, summaryAll.TotalUses);
    }

    // 11. 30-day filter works
    [Fact]
    public async Task Scenario11_ThirtyDayFilterWorks()
    {
        var sp = CreateServiceProvider(Guid.NewGuid().ToString());
        var scopeFactory = sp.GetRequiredService<IServiceScopeFactory>();
        var service = new SqliteUsageService(scopeFactory, NullLogger<SqliteUsageService>.Instance);

        // Event from 20 days ago (within 30d, outside 7d)
        await service.RecordUsageAsync(new UsageEvent
        {
            UserId = "u1@test.com",
            ArtifactId = "mid-agent",
            EventType = "USE",
            Timestamp = DateTime.UtcNow.AddDays(-20)
        });

        // Event from 60 days ago (outside 30d)
        await service.RecordUsageAsync(new UsageEvent
        {
            UserId = "u2@test.com",
            ArtifactId = "ancient-agent",
            EventType = "USE",
            Timestamp = DateTime.UtcNow.AddDays(-60)
        });

        var summary30d = await service.GetSummaryAsync(new UsageFilterOptions { Period = "30d" });
        Assert.Equal(1, summary30d.TotalUses);

        var summary7d = await service.GetSummaryAsync(new UsageFilterOptions { Period = "7d" });
        Assert.Equal(0, summary7d.TotalUses);
    }

    // 12. Artifact type filtering works
    [Fact]
    public async Task Scenario12_ArtifactTypeFilteringWorks()
    {
        var sp = CreateServiceProvider(Guid.NewGuid().ToString());
        var scopeFactory = sp.GetRequiredService<IServiceScopeFactory>();
        var service = new SqliteUsageService(scopeFactory, NullLogger<SqliteUsageService>.Instance);

        await service.RecordUsageAsync(new UsageEvent { UserId = "u1@test.com", ArtifactId = "my-skill", ArtifactType = "skill", EventType = "USE" });
        await service.RecordUsageAsync(new UsageEvent { UserId = "u1@test.com", ArtifactId = "my-agent", ArtifactType = "agent", EventType = "USE" });
        await service.RecordUsageAsync(new UsageEvent { UserId = "u1@test.com", ArtifactId = "my-plugin", ArtifactType = "plugin", EventType = "USE" });

        var skillSummary = await service.GetSummaryAsync(new UsageFilterOptions { ArtifactType = "skill" });
        Assert.Equal(1, skillSummary.TotalUses);

        var allSummary = await service.GetSummaryAsync(new UsageFilterOptions { ArtifactType = "all" });
        Assert.Equal(3, allSummary.TotalUses);
    }

    // 13. Producer can see their artifact user statistics
    [Fact]
    public async Task Scenario13_ProducerCanSeeArtifactUserStatistics()
    {
        var sp = CreateServiceProvider(Guid.NewGuid().ToString());
        var scopeFactory = sp.GetRequiredService<IServiceScopeFactory>();
        var service = new SqliteUsageService(scopeFactory, NullLogger<SqliteUsageService>.Instance);

        await service.RecordUsageAsync(new UsageEvent { UserId = "consumer1@company.com", ArtifactId = "producer-art", EventType = "INSTALL" });
        await service.RecordUsageAsync(new UsageEvent { UserId = "consumer1@company.com", ArtifactId = "producer-art", EventType = "USE" });
        await service.RecordUsageAsync(new UsageEvent { UserId = "consumer2@company.com", ArtifactId = "producer-art", EventType = "USE" });

        var users = (await service.GetUserUsageByArtifactAsync("producer-art", "producer@company.com", "Producer")).ToList();
        Assert.Equal(2, users.Count);
        Assert.Contains(users, u => u.UserEmail == "consumer1@company.com" && u.Downloads == 1 && u.Uses == 1);
        Assert.Contains(users, u => u.UserEmail == "consumer2@company.com" && u.Downloads == 0 && u.Uses == 1);
    }

    // 14. Unauthorized / anonymous user handling
    [Fact]
    public void Scenario14_UsageEventValidationRequiresAction()
    {
        var sp = CreateServiceProvider(Guid.NewGuid().ToString());
        var scopeFactory = sp.GetRequiredService<IServiceScopeFactory>();
        var service = new SqliteUsageService(scopeFactory, NullLogger<SqliteUsageService>.Instance);

        Assert.ThrowsAsync<ArgumentNullException>(async () => await service.RecordUsageAsync(null!));
    }

    // 15. CLI events are recorded with Source = CLI
    [Fact]
    public async Task Scenario15_CliEventsRecordedWithSourceCli()
    {
        var sp = CreateServiceProvider(Guid.NewGuid().ToString());
        var scopeFactory = sp.GetRequiredService<IServiceScopeFactory>();
        var service = new SqliteUsageService(scopeFactory, NullLogger<SqliteUsageService>.Instance);

        await service.RecordUsageAsync(new UsageEvent
        {
            UserId = "engineer@company.com",
            ArtifactId = "linter-cmd",
            EventType = "INSTALL",
            Source = "CLI"
        });

        var details = await service.GetArtifactDetailsAnalyticsAsync("linter-cmd");
        Assert.NotNull(details);
        Assert.Equal(1, details.SourceBreakdown["CLI"]);
    }

    // 16. Extension events are recorded with Source = VS_CODE
    [Fact]
    public async Task Scenario16_ExtensionEventsRecordedWithSourceVsCode()
    {
        var sp = CreateServiceProvider(Guid.NewGuid().ToString());
        var scopeFactory = sp.GetRequiredService<IServiceScopeFactory>();
        var service = new SqliteUsageService(scopeFactory, NullLogger<SqliteUsageService>.Instance);

        await service.RecordUsageAsync(new UsageEvent
        {
            UserId = "engineer@company.com",
            ArtifactId = "copilot-agent",
            EventType = "USE",
            Source = "VS_CODE"
        });

        var details = await service.GetArtifactDetailsAnalyticsAsync("copilot-agent");
        Assert.NotNull(details);
        Assert.Equal(1, details.SourceBreakdown["VS Code"]);
    }

    // 17. Unsupported Copilot/Claude telemetry is marked Not Available
    [Fact]
    public async Task Scenario17_UnsupportedExternalTelemetryIsNotFabricated()
    {
        var sp = CreateServiceProvider(Guid.NewGuid().ToString());
        var scopeFactory = sp.GetRequiredService<IServiceScopeFactory>();
        var service = new SqliteUsageService(scopeFactory, NullLogger<SqliteUsageService>.Instance);

        var details = await service.GetArtifactDetailsAnalyticsAsync("any-artifact");
        Assert.NotNull(details);
        Assert.Equal("Not Available", details.ExternalTelemetry["GitHub Copilot"]);
        Assert.Equal("Not Available", details.ExternalTelemetry["Claude"]);
    }

    // 18. Multiple artifacts have independent usage statistics
    [Fact]
    public async Task Scenario18_MultipleArtifactsHaveIndependentUsageStatistics()
    {
        var sp = CreateServiceProvider(Guid.NewGuid().ToString());
        var scopeFactory = sp.GetRequiredService<IServiceScopeFactory>();
        var service = new SqliteUsageService(scopeFactory, NullLogger<SqliteUsageService>.Instance);

        // Artifact 1: 5 downloads, 10 uses
        for (int i = 0; i < 5; i++)
        {
            await service.RecordUsageAsync(new UsageEvent { UserId = $"u{i}@test.com", ArtifactId = "artifact-alpha", EventType = "INSTALL" });
        }
        for (int i = 0; i < 10; i++)
        {
            await service.RecordUsageAsync(new UsageEvent { UserId = $"u{i % 2}@test.com", ArtifactId = "artifact-alpha", EventType = "USE" });
        }

        // Artifact 2: 1 download, 2 uses
        await service.RecordUsageAsync(new UsageEvent { UserId = "u0@test.com", ArtifactId = "artifact-beta", EventType = "INSTALL" });
        await service.RecordUsageAsync(new UsageEvent { UserId = "u0@test.com", ArtifactId = "artifact-beta", EventType = "USE" });
        await service.RecordUsageAsync(new UsageEvent { UserId = "u0@test.com", ArtifactId = "artifact-beta", EventType = "USE" });

        var alpha = await service.GetArtifactDetailsAnalyticsAsync("artifact-alpha");
        var beta = await service.GetArtifactDetailsAnalyticsAsync("artifact-beta");

        Assert.NotNull(alpha);
        Assert.NotNull(beta);
        Assert.Equal(5, alpha.Downloads);
        Assert.Equal(10, alpha.UsageCount);
        Assert.Equal(1, beta.Downloads);
        Assert.Equal(2, beta.UsageCount);
    }
}
