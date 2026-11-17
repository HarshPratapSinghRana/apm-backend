using System.Threading.Tasks;

namespace EngineeringCommons.Backend.Events;

public interface IDomainEventPublisher
{
    Task PublishAsync<TEvent>(TEvent domainEvent) where TEvent : ReviewDomainEvent;
}
