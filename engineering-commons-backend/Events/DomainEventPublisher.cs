using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace EngineeringCommons.Backend.Events;

public interface IReviewEventHandler<in TEvent> where TEvent : ReviewDomainEvent
{
    Task HandleAsync(TEvent domainEvent);
}

public class DomainEventPublisher : IDomainEventPublisher
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<DomainEventPublisher> _logger;

    public DomainEventPublisher(IServiceProvider serviceProvider, ILogger<DomainEventPublisher> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    public async Task PublishAsync<TEvent>(TEvent domainEvent) where TEvent : ReviewDomainEvent
    {
        if (domainEvent == null) return;

        using var scope = _serviceProvider.CreateScope();
        var handlers = scope.ServiceProvider.GetServices<IReviewEventHandler<TEvent>>();

        foreach (var handler in handlers)
        {
            try
            {
                await handler.HandleAsync(domainEvent);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing event handler {Handler} for event {Event}", handler.GetType().Name, typeof(TEvent).Name);
            }
        }
    }
}
