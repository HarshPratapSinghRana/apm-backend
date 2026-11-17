using System;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using EngineeringCommons.Backend.Data;
using EngineeringCommons.Backend.Events;
using EngineeringCommons.Backend.Models;
using EngineeringCommons.Backend.Services.Interfaces;
using EngineeringCommons.Backend.Services.Implementations;

namespace EngineeringCommons.Backend.Extensions;

/// <summary>
/// Modular service collection extensions separating service registrations from Program.cs bootstrap.
/// </summary>
public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddEngineeringCommonsServices(
        this IServiceCollection services, 
        IConfiguration configuration,
        bool useInMemory,
        string sqliteConnectionString)
    {
        // 1. Persistence Layer (SQLite / EF Core)
        services.AddDbContext<CipDbContext>(options =>
            options.UseSqlite(sqliteConnectionString));

        // 2. Domain Event Handlers
        services.AddSingleton<IDomainEventPublisher, DomainEventPublisher>();
        services.AddScoped<IReviewEventHandler<ReviewAssignedEvent>, ReviewNotificationEventHandler>();
        services.AddScoped<IReviewEventHandler<FeedbackAddedEvent>, ReviewNotificationEventHandler>();
        services.AddScoped<IReviewEventHandler<LineCommentAddedEvent>, ReviewNotificationEventHandler>();
        services.AddScoped<IReviewEventHandler<ProducerRepliedEvent>, ReviewNotificationEventHandler>();
        services.AddScoped<IReviewEventHandler<ChangesRequestedEvent>, ReviewNotificationEventHandler>();
        services.AddScoped<IReviewEventHandler<ResubmittedEvent>, ReviewNotificationEventHandler>();
        services.AddScoped<IReviewEventHandler<ReviewApprovedEvent>, ReviewNotificationEventHandler>();
        services.AddScoped<IReviewEventHandler<ReviewRejectedEvent>, ReviewNotificationEventHandler>();
        services.AddScoped<IReviewEventHandler<ReviewCancelledEvent>, ReviewNotificationEventHandler>();

        // 3. Storage Repositories
        if (useInMemory)
        {
            services.AddSingleton<IReviewRepository, InMemoryReviewRepository>();
            services.AddSingleton<IUsageService, InMemoryUsageService>();
            services.AddSingleton<INotificationService, InMemoryNotificationService>();
            services.AddSingleton<IUserRoleService, InMemoryUserRoleService>();
        }
        else
        {
            services.AddSingleton<IReviewRepository, SqliteReviewRepository>();
            services.AddSingleton<IUsageService, SqliteUsageService>();
            services.AddSingleton<INotificationService, SqliteNotificationService>();
            services.AddSingleton<IUserRoleService, SqliteUserRoleService>();
        }

        // 4. Core Business Services
        services.AddSingleton<IAuthenticationService, StaticAuthenticationService>();
        services.AddSingleton<ITokenService, InMemoryTokenService>();
        services.AddSingleton<IArtifactClassifier, ArtifactClassifier>();
        services.AddSingleton<IReviewService, ReviewService>();
        services.AddHttpClient();
        services.AddHttpClient("github");
        services.AddHttpClient("azuredevops");
        services.Configure<GitHubOptions>(configuration.GetSection("GitHub"));
        services.Configure<AzureDevOpsOptions>(configuration.GetSection("AzureDevOps"));
        services.AddSingleton<IMarketplaceService, AzureDevOpsMarketplaceService>();
        services.AddSingleton<IArtifactDiffService, ArtifactDiffService>();
        services.AddSingleton<IReviewThreadService, ReviewThreadService>();
        services.AddSingleton<IReviewCommentService, ReviewCommentService>();
        services.AddSingleton<IMicrosoftGraphEmailClient, MicrosoftGraphEmailClient>();
        services.AddSingleton<IEmailNotificationService, EmailNotificationService>();
        services.AddSingleton<IBountyService, BountyService>();
        services.Configure<CertificationOptions>(configuration.GetSection("Certification"));
        services.AddSingleton<ICertificationService, CertificationService>();
        services.AddSingleton<IArtifactRecommendationService, ArtifactRecommendationService>();

        // 5. Background Hosted Services
        services.AddHostedService<SlaMonitoringBackgroundService>();

        return services;
    }
}
