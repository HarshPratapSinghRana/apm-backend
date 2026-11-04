using System.Threading.Tasks;

namespace CipBackend.Events;

public interface IDomainEventPublisher
{
    Task PublishAsync<TEvent>(TEvent domainEvent) where TEvent : ReviewDomainEvent;
}
