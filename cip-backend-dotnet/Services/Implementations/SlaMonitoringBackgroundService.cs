using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using CipBackend.Services.Interfaces;

namespace CipBackend.Services.Implementations;

public class SlaMonitoringBackgroundService : BackgroundService
{
    private readonly IReviewService _reviewService;
    private readonly IBountyService _bountyService;
    private readonly ILogger<SlaMonitoringBackgroundService> _logger;
    private readonly TimeSpan _checkInterval = TimeSpan.FromSeconds(60);

    public SlaMonitoringBackgroundService(
        IReviewService reviewService,
        IBountyService bountyService,
        ILogger<SlaMonitoringBackgroundService> logger)
    {
        _reviewService = reviewService;
        _bountyService = bountyService;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("⏱️ Review SLA Monitoring Service started. Checking every {Interval}s.", _checkInterval.TotalSeconds);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var remindersSent = await _reviewService.CheckSlaAndSendRemindersAsync();
                if (remindersSent > 0)
                {
                    _logger.LogInformation("⏱️ SLA Check: Sent {Count} review SLA reminder/escalation notification(s).", remindersSent);
                }

                var autoReleased = _bountyService.ProcessAutoReleases();
                if (autoReleased > 0)
                {
                    _logger.LogInformation("⏱️ Bounty Auto-Release: Released {Count} idle/expired bounty(ies) back to open pool.", autoReleased);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while evaluating review SLA deadlines and bounty auto-releases.");
            }

            try
            {
                await Task.Delay(_checkInterval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }

        _logger.LogInformation("⏱️ Review SLA Monitoring Service stopped.");
    }
}
