using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using EngineeringCommons.Backend.Data;
using EngineeringCommons.Backend.Models;
using EngineeringCommons.Backend.Services.Implementations;
using EngineeringCommons.Backend.IntegrationTests;
using Xunit;

namespace EngineeringCommons.Backend.Tests;

public class NotificationServiceTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public NotificationServiceTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private ServiceProvider CreateServiceProvider(string dbName)
    {
        var services = new ServiceCollection();
        services.AddDbContext<EngineeringCommonsDbContext>(options =>
            options.UseInMemoryDatabase(dbName));

        return services.BuildServiceProvider();
    }

    private async Task<string> LoginAsync(string email, string password)
    {
        var res = await _client.PostAsJsonAsync("/api/auth/login", new { email, password });
        res.EnsureSuccessStatusCode();
        var body = await res.Content.ReadFromJsonAsync<LoginResponse>();
        return body!.Token;
    }

    private class LoginResponse
    {
        public string Token { get; set; } = string.Empty;
    }

    [Fact]
    public async Task SqliteNotificationService_CreateAndRetrieveUserNotifications()
    {
        var sp = CreateServiceProvider(Guid.NewGuid().ToString());
        var scopeFactory = sp.GetRequiredService<IServiceScopeFactory>();
        var logger = NullLogger<SqliteNotificationService>.Instance;

        var service = new SqliteNotificationService(scopeFactory, logger);

        // Create notification for reviewer
        await service.CreateNotificationAsync(new Notification
        {
            RecipientEmail = "reviewer@test.com",
            SubmissionId = "rev-101",
            ThreadId = "th-101",
            ArtifactId = "design-reviewer",
            ArtifactName = "design-reviewer",
            ArtifactVersion = "1.1.0",
            Type = NotificationType.ReviewAssigned,
            Title = "design-reviewer v1.1.0",
            Message = "design-reviewer v1.1.0 is waiting for your review."
        });

        // Create notification for producer
        await service.CreateNotificationAsync(new Notification
        {
            RecipientEmail = "producer@test.com",
            SubmissionId = "rev-102",
            ThreadId = "th-102",
            ArtifactId = "design-reviewer",
            ArtifactName = "design-reviewer",
            ArtifactVersion = "1.1.0",
            Type = NotificationType.ReviewApproved,
            Title = "design-reviewer v1.1.0",
            Message = "design-reviewer approved."
        });

        var reviewerNotifs = (await service.GetUserNotificationsAsync("reviewer@test.com")).ToList();
        var producerNotifs = (await service.GetUserNotificationsAsync("producer@test.com")).ToList();

        // 1. Correct recipient receives notification
        Assert.Single(reviewerNotifs);
        Assert.Equal("ReviewAssigned", reviewerNotifs[0].Type.ToString());
        Assert.Equal("rev-101", reviewerNotifs[0].SubmissionId);
        Assert.Equal("th-101", reviewerNotifs[0].ThreadId);

        // 2. Producer does not receive reviewer-only assignment notification
        Assert.Single(producerNotifs);
        Assert.Equal("ReviewApproved", producerNotifs[0].Type.ToString());
        Assert.Equal("rev-102", producerNotifs[0].SubmissionId);
        Assert.Equal("th-102", producerNotifs[0].ThreadId);
    }

    [Fact]
    public async Task SqliteNotificationService_DuplicatePrevention()
    {
        var sp = CreateServiceProvider(Guid.NewGuid().ToString());
        var scopeFactory = sp.GetRequiredService<IServiceScopeFactory>();
        var logger = NullLogger<SqliteNotificationService>.Instance;

        var service = new SqliteNotificationService(scopeFactory, logger);

        var notif1 = new Notification
        {
            RecipientEmail = "reviewer@test.com",
            SubmissionId = "rev-dup-1",
            ArtifactId = "test-art",
            ArtifactName = "test-art",
            Type = NotificationType.ReviewAssigned,
            Title = "test-art v1.0.0",
            Message = "New review assigned",
            ReferenceId = "ref-dup-123"
        };

        var created1 = await service.CreateNotificationAsync(notif1);
        Assert.NotNull(created1);

        // Attempt to create duplicate with same ReferenceId
        var notif2 = new Notification
        {
            RecipientEmail = "reviewer@test.com",
            SubmissionId = "rev-dup-1",
            ArtifactId = "test-art",
            ArtifactName = "test-art",
            Type = NotificationType.ReviewAssigned,
            Title = "test-art v1.0.0",
            Message = "New review assigned",
            ReferenceId = "ref-dup-123"
        };

        var created2 = await service.CreateNotificationAsync(notif2);
        Assert.Equal(created1.Id, created2.Id);

        var list = (await service.GetUserNotificationsAsync("reviewer@test.com")).ToList();
        Assert.Single(list);
    }

    [Fact]
    public async Task MarkAsReadAsync_UpdatesNotificationReadAt()
    {
        var sp = CreateServiceProvider(Guid.NewGuid().ToString());
        var scopeFactory = sp.GetRequiredService<IServiceScopeFactory>();
        var logger = NullLogger<SqliteNotificationService>.Instance;

        var service = new SqliteNotificationService(scopeFactory, logger);

        var notif = await service.CreateNotificationAsync(new Notification
        {
            RecipientEmail = "reviewer@test.com",
            SubmissionId = "rev-201",
            ArtifactId = "my-agent",
            ArtifactName = "my-agent",
            Type = NotificationType.ReviewAssigned,
            Title = "New review assigned",
            Message = "my-agent is waiting for review."
        });

        Assert.False(notif.IsRead);

        var marked = await service.MarkAsReadAsync(notif.Id, "reviewer@test.com");
        Assert.True(marked);

        var unread = (await service.GetUserNotificationsAsync("reviewer@test.com", unreadOnly: true)).ToList();
        Assert.Empty(unread);

        var all = (await service.GetUserNotificationsAsync("reviewer@test.com", unreadOnly: false)).ToList();
        Assert.Single(all);
        Assert.True(all[0].IsRead);
    }

    [Fact]
    public async Task Full_Thread_Notification_Workflow_EndToEnd()
    {
        // 1. Unauthenticated access returns 401
        var unauthRes = await _client.GetAsync("/api/notifications");
        Assert.Equal(HttpStatusCode.Unauthorized, unauthRes.StatusCode);

        // Login Reviewer
        var reviewerToken = await LoginAsync("reviewer@company.com", "password");
        var clientReviewer = _factory.CreateClient();
        clientReviewer.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", reviewerToken);

        // Login Producer
        var producerToken = await LoginAsync("producer@company.com", "password");
        var clientProducer = _factory.CreateClient();
        clientProducer.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", producerToken);

        // Step 1: Producer submits artifact change
        var submitRes = await clientProducer.PostAsJsonAsync("/api/artifacts/thread-e2e-agent/changes", new { Content = "# Version 1.0.0 Content" });
        submitRes.EnsureSuccessStatusCode();
        var submitData = await submitRes.Content.ReadFromJsonAsync<SubmitResponse>();
        var reviewId = submitData!.ReviewId;

        // Step 2: Reviewer gets ReviewAssigned notification
        var revNotifs1 = await clientReviewer.GetFromJsonAsync<List<NotificationDto>>("/api/notifications?unreadOnly=true");
        Assert.NotNull(revNotifs1);
        Assert.Contains(revNotifs1, n => n.SubmissionId == reviewId && (n.Type == "ReviewAssigned" || n.Type == "Resubmitted"));

        // Step 3: Reviewer adds feedback message to the thread
        var msgRes1 = await clientReviewer.PostAsJsonAsync($"/api/reviews/{reviewId}/thread/messages", new { Message = "Please update the error handling." });
        msgRes1.EnsureSuccessStatusCode();

        // Step 4: Producer receives FeedbackAdded notification
        var prodNotifs1 = await clientProducer.GetFromJsonAsync<List<NotificationDto>>("/api/notifications?unreadOnly=true");
        Assert.NotNull(prodNotifs1);
        var feedbackNotif = prodNotifs1.FirstOrDefault(n => n.SubmissionId == reviewId && n.Type == "FeedbackAdded");
        Assert.NotNull(feedbackNotif);
        Assert.Contains("added feedback", feedbackNotif.Message);

        // Step 5: Producer replies to the thread
        var msgRes2 = await clientProducer.PostAsJsonAsync($"/api/reviews/{reviewId}/thread/messages", new { Message = "Updated the error handling. Please review again." });
        msgRes2.EnsureSuccessStatusCode();

        // Step 6: Reviewer receives ProducerReplied notification
        var revNotifs2 = await clientReviewer.GetFromJsonAsync<List<NotificationDto>>("/api/notifications?unreadOnly=true");
        Assert.NotNull(revNotifs2);
        var replyNotif = revNotifs2.FirstOrDefault(n => n.SubmissionId == reviewId && n.Type == "ProducerReplied");
        Assert.NotNull(replyNotif);
        Assert.Contains("replied to your review thread", replyNotif.Message);

        // Step 7: Reviewer requests changes explicitly
        var statusRes = await clientReviewer.PostAsJsonAsync($"/api/reviews/{reviewId}/thread/status", new { Status = "ChangesRequested" });
        statusRes.EnsureSuccessStatusCode();

        // Step 8: Producer receives ChangesRequested notification
        var prodNotifs2 = await clientProducer.GetFromJsonAsync<List<NotificationDto>>("/api/notifications?unreadOnly=true");
        Assert.NotNull(prodNotifs2);
        var changesNotif = prodNotifs2.FirstOrDefault(n => n.SubmissionId == reviewId && n.Type == "ChangesRequested");
        Assert.NotNull(changesNotif);

        // Step 9: Producer resubmits artifact
        var resubmitRes = await clientProducer.PostAsJsonAsync("/api/artifacts/thread-e2e-agent/changes", new { Content = "# Version 1.0.1 Content with fixes" });
        resubmitRes.EnsureSuccessStatusCode();

        // Step 10: Reviewer receives Resubmitted notification
        var revNotifs3 = await clientReviewer.GetFromJsonAsync<List<NotificationDto>>("/api/notifications?unreadOnly=true");
        Assert.NotNull(revNotifs3);
        var resubmitNotif = revNotifs3.FirstOrDefault(n => n.Type == "Resubmitted");
        Assert.NotNull(resubmitNotif);
        Assert.Contains("resubmitted", resubmitNotif.Message);

        // Step 11: Reviewer approves review
        var approveRes = await clientReviewer.PostAsJsonAsync($"/api/reviews/{reviewId}/approve", new { Feedback = "Looks great, approved!" });
        approveRes.EnsureSuccessStatusCode();

        // Step 12: Producer receives ReviewApproved notification
        var prodNotifs3 = await clientProducer.GetFromJsonAsync<List<NotificationDto>>("/api/notifications?unreadOnly=true");
        Assert.NotNull(prodNotifs3);
        var approvedNotif = prodNotifs3.FirstOrDefault(n => n.SubmissionId == reviewId && n.Type == "ReviewApproved");
        Assert.NotNull(approvedNotif);
        Assert.Contains("approved", approvedNotif.Message);

        // Step 13: Producer marks notification as read
        var markRes = await clientProducer.PostAsync($"/api/notifications/{approvedNotif.Id}/read", null);
        markRes.EnsureSuccessStatusCode();

        var prodUnread = await clientProducer.GetFromJsonAsync<List<NotificationDto>>("/api/notifications?unreadOnly=true");
        Assert.NotNull(prodUnread);
        Assert.DoesNotContain(prodUnread, n => n.Id == approvedNotif.Id);
    }

    private class SubmitResponse
    {
        public string ReviewId { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
    }
}
