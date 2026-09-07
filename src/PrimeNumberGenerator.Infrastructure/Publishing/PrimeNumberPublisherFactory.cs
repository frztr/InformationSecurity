using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using PrimeNumberGenerator.Application.Configuration;
using PrimeNumberGenerator.Application.Publishing;

namespace PrimeNumberGenerator.Infrastructure.Publishing;

/// <summary>
/// Выбирает консольный или Kafka-публикатор по конфигурации.
/// </summary>
public sealed class PrimeNumberPublisherFactory
{
    private readonly PublishingOptions _publishingOptions;
    private readonly IServiceProvider _serviceProvider;

    /// <summary>
    /// Создаёт фабрику, которая берёт публикаторы из <paramref name="serviceProvider"/>.
    /// </summary>
    public PrimeNumberPublisherFactory(
        IOptions<PublishingOptions> publishingOptions,
        IServiceProvider serviceProvider)
    {
        _publishingOptions = publishingOptions.Value;
        _serviceProvider = serviceProvider;
    }

    /// <summary>
    /// Возвращает публикатор, соответствующий <see cref="PublishingOptions.Destination"/>.
    /// </summary>
    public IPrimeNumberPublisher Resolve()
    {
        return _publishingOptions.Destination switch
        {
            PublishingDestination.Console => _serviceProvider.GetRequiredService<ConsolePrimeNumberPublisher>(),
            PublishingDestination.Kafka => _serviceProvider.GetRequiredService<KafkaPrimeNumberPublisher>(),
            _ => throw new InvalidOperationException(
                $"Канал публикации '{_publishingOptions.Destination}' не поддерживается. Используйте Console или Kafka.")
        };
    }
}
