using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using EngineeringCommons.Backend.Data;
using EngineeringCommons.Backend.Models;
using EngineeringCommons.Backend.Services.Implementations;
using Xunit;

namespace EngineeringCommons.Backend.Tests;

public class SqliteUsageServiceTests
{
    private ServiceProvider CreateServiceProvider(string dbName)
    {
        var services = new ServiceCollection();
        services.AddDbContext<CipDbContext>(options =>
            options.UseInMemoryDatabase(dbName));

        return services.BuildServiceProvider();
    }

    [Fact]
    public async Task RecordUsageAsync_SavesEventToDbContext()
    {
        var sp = CreateServiceProvider(Guid.NewGuid().ToString());
        var scopeFactory = sp.GetRequiredService<IServiceScopeFactory>();
        var logger = NullLogger<SqliteUsageService>.Instance;

        var service = new SqliteUsageService(scopeFactory, logger);

        var usageEvent = new UsageEvent
        {
            Action = "INSTALL",
            ArtifactName = "design-reviewer",
            ArtifactType = "agent",
            ArtifactVersion = "1.0.0",
            UserId = "consumer@test.com",
            Source = "vscode",
            Workspace = "/workspace/my-app",
            Timestamp = DateTime.UtcNow
        };

        await service.RecordUsageAsync(usageEvent);

        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CipDbContext>();

        var saved = await db.UsageEvents.FirstOrDefaultAsync(e => e.Id == usageEvent.Id);
        Assert.NotNull(saved);
        Assert.Equal("INSTALL", saved.Action);
        Assert.Equal("design-reviewer", saved.ArtifactName);
        Assert.Equal("consumer@test.com", saved.UserId);
        Assert.Equal("vscode", saved.Source);
    }

    [Fact]
    public async Task GetUsageEventsAsync_FiltersByUserId_Correctly()
    {
        var sp = CreateServiceProvider(Guid.NewGuid().ToString());
        var scopeFactory = sp.GetRequiredService<IServiceScopeFactory>();
        var logger = NullLogger<SqliteUsageService>.Instance;

        var service = new SqliteUsageService(scopeFactory, logger);

        await service.RecordUsageAsync(new UsageEvent { Action = "LOGIN", UserId = "consumer@test.com", Source = "vscode" });
        await service.RecordUsageAsync(new UsageEvent { Action = "INSTALL", UserId = "consumer@test.com", Source = "vscode" });
        await service.RecordUsageAsync(new UsageEvent { Action = "CONTRIBUTE", UserId = "producer@test.com", Source = "vscode" });

        var consumerEvents = (await service.GetUsageEventsAsync("consumer@test.com")).ToList();
        var allEvents = (await service.GetUsageEventsAsync(null)).ToList();

        Assert.Equal(2, consumerEvents.Count);
        Assert.Equal(3, allEvents.Count);
    }

    [Fact]
    public void SqliteReviewRepository_AddsAndRetrievesReview()
    {
        var sp = CreateServiceProvider(Guid.NewGuid().ToString());
        var scopeFactory = sp.GetRequiredService<IServiceScopeFactory>();

        var repo = new SqliteReviewRepository(scopeFactory);

        var review = new Review
        {
            ArtifactId = "my-new-skill",
            ProducerEmail = "producer@test.com",
            Content = "Test payload",
            Status = ReviewStatus.Submitted
        };

        repo.Add(review);

        var retrieved = repo.Get(review.Id);
        Assert.NotNull(retrieved);
        Assert.Equal("my-new-skill", retrieved.ArtifactId);
        Assert.Equal(ReviewStatus.Submitted, retrieved.Status);

        // Update review status
        retrieved.Status = ReviewStatus.Approved;
        retrieved.ReviewerEmail = "reviewer@test.com";
        repo.Add(retrieved);

        var updated = repo.Get(review.Id);
        Assert.NotNull(updated);
        Assert.Equal(ReviewStatus.Approved, updated.Status);
        Assert.Equal("reviewer@test.com", updated.ReviewerEmail);
    }
}
