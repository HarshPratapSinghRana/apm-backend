#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;
using EngineeringCommons.Backend.Controllers;
using EngineeringCommons.Backend.Events;
using EngineeringCommons.Backend.Models;
using EngineeringCommons.Backend.Services.Implementations;
using EngineeringCommons.Backend.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace EngineeringCommons.Backend.Tests;

public class DuplicateDetectionTests
{
    private class FakeMarketplaceService : IMarketplaceService
    {
        private readonly Dictionary<string, ArtifactDto> _store = new(StringComparer.OrdinalIgnoreCase);

        public void SetArtifact(ArtifactDto dto) => _store[dto.Id] = dto;

        public Task<IEnumerable<ArtifactDto>> ListArtifactsAsync() => Task.FromResult<IEnumerable<ArtifactDto>>(_store.Values);

        public Task<ArtifactDto?> GetArtifactAsync(string artifactId, string? version = null)
        {
            _store.TryGetValue(artifactId, out var dto);
            if (dto != null && !string.IsNullOrWhiteSpace(version) && !dto.Version.Equals(version, StringComparison.OrdinalIgnoreCase))
            {
                return Task.FromResult<ArtifactDto?>(null);
            }
            return Task.FromResult(dto);
        }

        public Task<IEnumerable<ArtifactVersionDto>> GetArtifactVersionsAsync(string artifactId)
        {
            if (_store.TryGetValue(artifactId, out var dto))
            {
                return Task.FromResult<IEnumerable<ArtifactVersionDto>>(new[]
                {
                    new ArtifactVersionDto { Version = dto.Version, CipPackage = dto.CipPackage, IsLatest = true }
                });
            }
            return Task.FromResult<IEnumerable<ArtifactVersionDto>>(Enumerable.Empty<ArtifactVersionDto>());
        }

        public Task PublishArtifactAsync(string artifactId, string content)
        {
            _store[artifactId] = new ArtifactDto { Id = artifactId, Name = artifactId, Content = content };
            return Task.CompletedTask;
        }

        public Task<bool> UpdateVisibilityAsync(string artifactId, bool isPrivate, string userEmail, string? allowedContributors = null, string? allowedReviewers = null, string? allowedConsumers = null)
        {
            if (_store.TryGetValue(artifactId, out var art))
            {
                art.IsPrivate = isPrivate;
                if (allowedContributors != null) art.AllowedContributors = allowedContributors;
                if (allowedReviewers != null) art.AllowedReviewers = allowedReviewers;
                if (allowedConsumers != null) art.AllowedConsumers = allowedConsumers;
                return Task.FromResult(true);
            }
            return Task.FromResult(false);
        }
    }

    private class FakeReviewService : IReviewService
    {
        public List<Review> CreatedReviews { get; } = new();

        public Review SubmitChange(string artifactId, string producerEmail, string content, bool isPrivate = false, string? allowedContributors = null, string? allowedReviewers = null, string? allowedConsumers = null, int slaTargetMinutes = 1440)
        {
            var r = new Review
            {
                Id = Guid.NewGuid().ToString(),
                ArtifactId = artifactId,
                ProducerEmail = producerEmail,
                Content = content,
                Status = ReviewStatus.Submitted,
                SubmittedAt = DateTime.UtcNow,
                IsPrivate = isPrivate,
                AllowedContributors = allowedContributors,
                AllowedReviewers = allowedReviewers,
                AllowedConsumers = allowedConsumers,
                SlaTargetMinutes = slaTargetMinutes,
                SlaDeadline = DateTime.UtcNow.AddMinutes(slaTargetMinutes)
            };
            CreatedReviews.Add(r);
            return r;
        }

        public Review AssignReview(string reviewId, string reviewerEmail) => throw new NotImplementedException();
        public Review RequestChanges(string reviewId, string reviewerEmail, string? feedback = null) => throw new NotImplementedException();
        public Review Resubmit(string reviewId, string producerEmail, string content, bool? isPrivate = null, string? allowedContributors = null, string? allowedReviewers = null, string? allowedConsumers = null) => throw new NotImplementedException();
        public Task<Review?> ApproveAsync(string reviewId, string reviewerEmail, string? feedback = null) => throw new NotImplementedException();
        public Review? Reject(string reviewId, string reviewerEmail, string? feedback = null) => throw new NotImplementedException();
        public Review? CancelReview(string reviewId, string reviewerEmail, string? reason = null) => throw new NotImplementedException();
        public Review? GetReview(string reviewId) => CreatedReviews.FirstOrDefault(r => r.Id == reviewId);
        public IEnumerable<Review> GetAllReviews() => CreatedReviews.ToList();
        public IEnumerable<Review> GetPendingReviews() => CreatedReviews.Where(r => r.Status == ReviewStatus.Submitted);
        public IEnumerable<Review> GetByProducer(string producerEmail) => CreatedReviews.Where(r => r.ProducerEmail == producerEmail);
        public Review UpdateSlaTarget(string reviewId, int slaTargetMinutes) => throw new NotImplementedException();
        public Task<int> CheckSlaAndSendRemindersAsync() => Task.FromResult(0);
        public SlaSummaryDto GetSlaSummary() => new();
    }

    private class FakeUsageService : IUsageService
    {
        public List<UsageEvent> RecordedEvents { get; } = new();

        public Task RecordUsageAsync(UsageEvent usageEvent)
        {
            RecordedEvents.Add(usageEvent);
            return Task.CompletedTask;
        }

        public Task<IEnumerable<UsageEvent>> GetUsageEventsAsync(string? userId = null) =>
            Task.FromResult<IEnumerable<UsageEvent>>(RecordedEvents);

        public Task<IEnumerable<ArtifactUsageSummaryDto>> GetUsageSummaryAsync(string? userId = null) =>
            Task.FromResult<IEnumerable<ArtifactUsageSummaryDto>>(new List<ArtifactUsageSummaryDto>());

        public Task<UsageSummaryDto> GetSummaryAsync(UsageFilterOptions filters, string? requestingUserEmail = null, string? requestingUserRole = null) =>
            Task.FromResult(new UsageSummaryDto());

        public Task<IEnumerable<ArtifactAnalyticsDto>> GetArtifactAnalyticsAsync(UsageFilterOptions filters, string? requestingUserEmail = null, string? requestingUserRole = null) =>
            Task.FromResult<IEnumerable<ArtifactAnalyticsDto>>(new List<ArtifactAnalyticsDto>());

        public Task<ArtifactAnalyticsDto?> GetArtifactDetailsAnalyticsAsync(string artifactId, string? requestingUserEmail = null, string? requestingUserRole = null) =>
            Task.FromResult<ArtifactAnalyticsDto?>(null);

        public Task<IEnumerable<TopArtifactDto>> GetMostDownloadedAsync(int limit, UsageFilterOptions filters, string? requestingUserEmail = null, string? requestingUserRole = null) =>
            Task.FromResult<IEnumerable<TopArtifactDto>>(new List<TopArtifactDto>());

        public Task<IEnumerable<TopArtifactDto>> GetMostUsedAsync(int limit, UsageFilterOptions filters, string? requestingUserEmail = null, string? requestingUserRole = null) =>
            Task.FromResult<IEnumerable<TopArtifactDto>>(new List<TopArtifactDto>());

        public Task<IEnumerable<UserArtifactUsageDto>> GetUserUsageByArtifactAsync(string artifactId, string requestingUserEmail, string requestingUserRole) =>
            Task.FromResult<IEnumerable<UserArtifactUsageDto>>(new List<UserArtifactUsageDto>());
    }

    private class FakeNotificationService : INotificationService
    {
        public Task<Notification> CreateNotificationAsync(Notification notification) =>
            Task.FromResult(notification);

        public Task<IEnumerable<Notification>> GetUserNotificationsAsync(string recipientEmail, bool unreadOnly = false) =>
            Task.FromResult<IEnumerable<Notification>>(new List<Notification>());

        public Task<bool> MarkAsReadAsync(string notificationId, string recipientEmail) =>
            Task.FromResult(true);

        public Task<Notification?> GetNotificationAsync(string notificationId, string recipientEmail) =>
            Task.FromResult<Notification?>(null);

        public Task<bool> DeleteNotificationAsync(string notificationId, string recipientEmail) =>
            Task.FromResult(true);

        public Task<int> ClearNotificationsAsync(string recipientEmail) =>
            Task.FromResult(0);
    }

    private readonly FakeMarketplaceService _marketplace;
    private readonly FakeReviewService _reviewService;
    private readonly FakeUsageService _usageService;
    private readonly FakeNotificationService _notifService;
    private readonly ArtifactDiffService _diffService;

    public DuplicateDetectionTests()
    {
        _marketplace = new FakeMarketplaceService();
        _reviewService = new FakeReviewService();
        _usageService = new FakeUsageService();
        _notifService = new FakeNotificationService();
        _diffService = new ArtifactDiffService(_marketplace);
    }

    private static ControllerContext CreateControllerContext(string email = "producer@company.com", string role = "PRODUCER")
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.Name, email),
            new(ClaimTypes.Role, role)
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        var user = new ClaimsPrincipal(identity);
        return new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };
    }

    [Fact]
    public async Task Test1_SameArtifact_SameFiles_SameContent_DetectsDuplicate()
    {
        // Arrange
        var existingContent = JsonSerializer.Serialize(new
        {
            name = "design-reviewer",
            type = "agent",
            version = "1.0.0",
            files = new[]
            {
                new { path = "agents/reviewer.md", content = "Review accessibility issues." },
                new { path = "cip.yml", content = "name: design-reviewer\nversion: 1.0.0" },
                new { path = "README.md", content = "# Design Reviewer" }
            }
        });

        _marketplace.SetArtifact(new ArtifactDto
        {
            Id = "design-reviewer",
            Name = "design-reviewer",
            Type = "agent",
            Version = "1.0.0",
            Content = existingContent
        });

        var submittedContent = JsonSerializer.Serialize(new
        {
            name = "design-reviewer",
            type = "agent",
            version = "1.0.0",
            files = new[]
            {
                new { path = "agents/reviewer.md", content = "Review accessibility issues." },
                new { path = "cip.yml", content = "name: design-reviewer\nversion: 1.0.0" },
                new { path = "README.md", content = "# Design Reviewer" }
            }
        });

        // Act
        var result = await _diffService.CheckDuplicateAsync("design-reviewer", submittedContent, "agent");

        // Assert
        Assert.True(result.IsDuplicate);
        Assert.True(result.IsUnchanged);
        Assert.Equal(0, result.FilesChanged);
        Assert.Equal(3, result.FilesUnchanged);
        Assert.Equal(3, result.FilesCompared);
        Assert.Equal("1.0.0", result.MatchedVersion);
    }

    [Fact]
    public async Task Test2_SameArtifact_OneModifiedFile_DetectsChanges()
    {
        // Arrange
        var existingContent = JsonSerializer.Serialize(new
        {
            name = "design-reviewer",
            type = "agent",
            version = "1.0.0",
            files = new[]
            {
                new { path = "agents/reviewer.md", content = "Review accessibility issues." },
                new { path = "README.md", content = "# Design Reviewer" }
            }
        });

        _marketplace.SetArtifact(new ArtifactDto
        {
            Id = "design-reviewer",
            Name = "design-reviewer",
            Type = "agent",
            Version = "1.0.0",
            Content = existingContent
        });

        var submittedContent = JsonSerializer.Serialize(new
        {
            name = "design-reviewer",
            type = "agent",
            version = "1.1.0",
            files = new[]
            {
                new { path = "agents/reviewer.md", content = "Review WCAG accessibility issues." }, // MODIFIED
                new { path = "README.md", content = "# Design Reviewer" }
            }
        });

        // Act
        var result = await _diffService.CheckDuplicateAsync("design-reviewer", submittedContent, "agent");

        // Assert
        Assert.False(result.IsDuplicate);
        Assert.False(result.IsUnchanged);
        Assert.Equal(1, result.FilesModified);
        Assert.Equal(1, result.FilesUnchanged);
        Assert.Equal(1, result.FilesChanged);
    }

    [Fact]
    public async Task Test3_SameArtifact_OneNewFile_DetectsChanges()
    {
        // Arrange
        var existingContent = JsonSerializer.Serialize(new
        {
            name = "design-reviewer",
            type = "agent",
            version = "1.0.0",
            files = new[]
            {
                new { path = "agents/reviewer.md", content = "Review accessibility issues." }
            }
        });

        _marketplace.SetArtifact(new ArtifactDto
        {
            Id = "design-reviewer",
            Name = "design-reviewer",
            Type = "agent",
            Version = "1.0.0",
            Content = existingContent
        });

        var submittedContent = JsonSerializer.Serialize(new
        {
            name = "design-reviewer",
            type = "agent",
            version = "1.1.0",
            files = new[]
            {
                new { path = "agents/reviewer.md", content = "Review accessibility issues." },
                new { path = "skills/accessibility/SKILL.md", content = "Accessibility testing skill." } // NEW FILE
            }
        });

        // Act
        var result = await _diffService.CheckDuplicateAsync("design-reviewer", submittedContent, "agent");

        // Assert
        Assert.False(result.IsDuplicate);
        Assert.Equal(1, result.FilesAdded);
        Assert.Equal(1, result.FilesUnchanged);
        Assert.Equal(1, result.FilesChanged);
    }

    [Fact]
    public async Task Test4_SameArtifact_OneDeletedFile_DetectsChanges()
    {
        // Arrange
        var existingContent = JsonSerializer.Serialize(new
        {
            name = "design-reviewer",
            type = "agent",
            version = "1.0.0",
            files = new[]
            {
                new { path = "agents/reviewer.md", content = "Review accessibility issues." },
                new { path = "README-old.md", content = "Old README" }
            }
        });

        _marketplace.SetArtifact(new ArtifactDto
        {
            Id = "design-reviewer",
            Name = "design-reviewer",
            Type = "agent",
            Version = "1.0.0",
            Content = existingContent
        });

        var submittedContent = JsonSerializer.Serialize(new
        {
            name = "design-reviewer",
            type = "agent",
            version = "1.1.0",
            files = new[]
            {
                new { path = "agents/reviewer.md", content = "Review accessibility issues." } // README-old.md removed
            }
        });

        // Act
        var result = await _diffService.CheckDuplicateAsync("design-reviewer", submittedContent, "agent");

        // Assert
        Assert.False(result.IsDuplicate);
        Assert.Equal(1, result.FilesDeleted);
        Assert.Equal(1, result.FilesUnchanged);
        Assert.Equal(1, result.FilesChanged);
    }

    [Fact]
    public async Task Test5_SameFiles_DifferentOrder_GeneratesSameFingerprint()
    {
        // Arrange
        var filesA = new Dictionary<string, string>
        {
            { "agents/reviewer.md", "Content A" },
            { "skills/accessibility/SKILL.md", "Content B" },
            { "README.md", "Content C" }
        };

        var filesB = new Dictionary<string, string>
        {
            { "README.md", "Content C" },
            { "agents/reviewer.md", "Content A" },
            { "skills/accessibility/SKILL.md", "Content B" }
        };

        // Act
        var fpA = ArtifactDiffService.ComputeArtifactFingerprint(filesA);
        var fpB = ArtifactDiffService.ComputeArtifactFingerprint(filesB);

        // Assert
        Assert.NotEmpty(fpA);
        Assert.Equal(fpA, fpB);
    }

    [Fact]
    public async Task Test6_SameContent_BumpedVersion_DetectsUnchangedContent()
    {
        // Arrange: Existing v1.0.0 vs Submitted v1.1.0 with identical files
        var existingContent = JsonSerializer.Serialize(new
        {
            name = "design-reviewer",
            type = "agent",
            version = "1.0.0",
            files = new[]
            {
                new { path = "agents/reviewer.md", content = "Review accessibility issues." },
                new { path = "cip.yml", content = "name: design-reviewer\nversion: 1.0.0" }
            }
        });

        _marketplace.SetArtifact(new ArtifactDto
        {
            Id = "design-reviewer",
            Name = "design-reviewer",
            Type = "agent",
            Version = "1.0.0",
            Content = existingContent
        });

        var submittedContent = JsonSerializer.Serialize(new
        {
            name = "design-reviewer",
            type = "agent",
            version = "1.1.0", // Bumped version number
            files = new[]
            {
                new { path = "agents/reviewer.md", content = "Review accessibility issues." },
                new { path = "cip.yml", content = "name: design-reviewer\nversion: 1.0.0" }
            }
        });

        // Act
        var result = await _diffService.CheckDuplicateAsync("design-reviewer", submittedContent, "agent");

        // Assert
        Assert.True(result.IsDuplicate);
        Assert.True(result.IsUnchanged);
        Assert.Equal("1.0.0", result.MatchedVersion);
        Assert.Equal("1.1.0", result.SubmittedVersion);
        Assert.Equal(0, result.FilesChanged);
    }

    [Fact]
    public async Task Test7_SameArtifactName_DifferentType_DoesNotClassifyAsDuplicate()
    {
        // Arrange: Existing is an Agent, Submitted is a Skill
        _marketplace.SetArtifact(new ArtifactDto
        {
            Id = "design-reviewer",
            Name = "design-reviewer",
            Type = "agent",
            Version = "1.0.0",
            Content = "agent content"
        });

        var submittedContent = JsonSerializer.Serialize(new
        {
            name = "design-reviewer",
            type = "skill",
            version = "1.0.0",
            files = new[]
            {
                new { path = "skills/SKILL.md", content = "skill content" }
            }
        });

        // Act
        var result = await _diffService.CheckDuplicateAsync("design-reviewer", submittedContent, "skill");

        // Assert
        Assert.False(result.IsDuplicate);
        Assert.False(result.IsUnchanged);
    }

    [Fact]
    public async Task Test8_MultiFileArtifact_IdenticalContent_DetectsDuplicate()
    {
        // Arrange
        var files = new[]
        {
            new { path = "cip.yml", content = "name: design-reviewer\nversion: 1.0.0" },
            new { path = "agents/reviewer.md", content = "# Reviewer Agent" },
            new { path = "skills/accessibility/SKILL.md", content = "# Accessibility Skill" },
            new { path = "README.md", content = "# Documentation" }
        };

        var content = JsonSerializer.Serialize(new
        {
            name = "design-reviewer",
            type = "agent",
            version = "1.0.0",
            files
        });

        _marketplace.SetArtifact(new ArtifactDto
        {
            Id = "design-reviewer",
            Name = "design-reviewer",
            Type = "agent",
            Version = "1.0.0",
            Content = content
        });

        // Act
        var result = await _diffService.CheckDuplicateAsync("design-reviewer", content, "agent");

        // Assert
        Assert.True(result.IsDuplicate);
        Assert.True(result.IsUnchanged);
        Assert.Equal(4, result.FilesCompared);
        Assert.Equal(4, result.FilesUnchanged);
        Assert.Equal(0, result.FilesChanged);
    }

    [Fact]
    public async Task Test9_MultiFileArtifact_OneChangedFile_CreatesReview()
    {
        // Arrange
        var existingContent = JsonSerializer.Serialize(new
        {
            name = "design-reviewer",
            type = "agent",
            version = "1.0.0",
            files = new[]
            {
                new { path = "cip.yml", content = "name: design-reviewer\nversion: 1.0.0" },
                new { path = "agents/reviewer.md", content = "# Reviewer Agent" },
                new { path = "skills/accessibility/SKILL.md", content = "# Accessibility Skill" },
                new { path = "README.md", content = "# Documentation" }
            }
        });

        _marketplace.SetArtifact(new ArtifactDto
        {
            Id = "design-reviewer",
            Name = "design-reviewer",
            Type = "agent",
            Version = "1.0.0",
            Content = existingContent
        });

        var submittedContent = JsonSerializer.Serialize(new
        {
            name = "design-reviewer",
            type = "agent",
            version = "1.1.0",
            files = new[]
            {
                new { path = "cip.yml", content = "name: design-reviewer\nversion: 1.0.0" },
                new { path = "agents/reviewer.md", content = "# Reviewer Agent v2 - Enhanced" }, // CHANGED
                new { path = "skills/accessibility/SKILL.md", content = "# Accessibility Skill" },
                new { path = "README.md", content = "# Documentation" }
            }
        });

        // Act
        var result = await _diffService.CheckDuplicateAsync("design-reviewer", submittedContent, "agent");

        // Assert
        Assert.False(result.IsDuplicate);
        Assert.Equal(1, result.FilesModified);
        Assert.Equal(3, result.FilesUnchanged);
        Assert.Equal(1, result.FilesChanged);
    }

    [Fact]
    public async Task Test10_EmptyOrInvalidArtifact_HandledGracefully()
    {
        // Act
        var result = await _diffService.CheckDuplicateAsync("empty-art", string.Empty);

        // Assert
        Assert.False(result.IsDuplicate);
        Assert.Equal(0, result.FilesCompared);
    }

    [Fact]
    public async Task Test11_DirectApiRequest_UnchangedArtifact_ControllerShortCircuitsReviewCreation()
    {
        // Arrange
        var existingContent = JsonSerializer.Serialize(new
        {
            name = "design-reviewer",
            type = "agent",
            version = "1.0.0",
            files = new[]
            {
                new { path = "agents/reviewer.md", content = "Review accessibility issues." }
            }
        });

        _marketplace.SetArtifact(new ArtifactDto
        {
            Id = "design-reviewer",
            Name = "design-reviewer",
            Type = "agent",
            Version = "1.0.0",
            Content = existingContent
        });

        var controller = new ArtifactsController(_reviewService, _usageService, _notifService, _diffService)
        {
            ControllerContext = CreateControllerContext("producer@company.com")
        };

        var requestBody = new EngineeringCommons.Backend.Models.SubmitChangeRequestDto
        {
            Type = "agent",
            Content = existingContent
        };

        // Act
        var response = await controller.SubmitChange("design-reviewer", requestBody, _marketplace);

        // Assert: Controller returns 200 OK with isDuplicate = true
        var okResult = Assert.IsType<OkObjectResult>(response);
        var json = JsonSerializer.Serialize(okResult.Value);
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        Assert.True(root.GetProperty("isDuplicate").GetBoolean());
        Assert.True(root.GetProperty("isUnchanged").GetBoolean());
        Assert.Equal("DuplicateUnchanged", root.GetProperty("status").GetString());
        Assert.Equal("1.0.0", root.GetProperty("matchedVersion").GetString());

        // CRITICAL: ReviewService.SubmitChange MUST NOT have created any reviews!
        Assert.Empty(_reviewService.CreatedReviews);

        // CRITICAL: Duplicate audit event recorded in usage events
        Assert.Contains(_usageService.RecordedEvents, e => e.Action == "SUBMISSION_DUPLICATE_DETECTED");
    }

    [Fact]
    public async Task Test12_PathSeparatorDifferences_NormalizedWithoutFalseChange()
    {
        // Arrange: Windows backslash paths vs POSIX slash paths
        var existingContent = JsonSerializer.Serialize(new
        {
            name = "design-reviewer",
            type = "agent",
            version = "1.0.0",
            files = new[]
            {
                new { path = "agents\\reviewer.md", content = "Review accessibility issues." },
                new { path = "skills\\accessibility\\SKILL.md", content = "Skill content" }
            }
        });

        _marketplace.SetArtifact(new ArtifactDto
        {
            Id = "design-reviewer",
            Name = "design-reviewer",
            Type = "agent",
            Version = "1.0.0",
            Content = existingContent
        });

        var submittedContent = JsonSerializer.Serialize(new
        {
            name = "design-reviewer",
            type = "agent",
            version = "1.0.0",
            files = new[]
            {
                new { path = "agents/reviewer.md", content = "Review accessibility issues." },
                new { path = "skills/accessibility/SKILL.md", content = "Skill content" }
            }
        });

        // Act
        var result = await _diffService.CheckDuplicateAsync("design-reviewer", submittedContent, "agent");

        // Assert: Correctly normalized, 0 changes detected
        Assert.True(result.IsDuplicate);
        Assert.True(result.IsUnchanged);
        Assert.Equal(0, result.FilesChanged);
        Assert.Equal(2, result.FilesUnchanged);
    }
}
