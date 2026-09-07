using Confluent.Kafka;

namespace PrimeNumberGenerator.Infrastructure.Publishing;

/// <summary>
/// Создаёт настроенные продюсеры Kafka.
/// </summary>
public interface IKafkaProducerFactory
{
    /// <summary>
    /// Собирает новый строковый продюсер по текущим настройкам Kafka.
    /// </summary>
    IProducer<string, string> Create();
}
