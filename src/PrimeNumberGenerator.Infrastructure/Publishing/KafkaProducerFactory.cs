using Confluent.Kafka;
using Microsoft.Extensions.Options;
using PrimeNumberGenerator.Application.Configuration;

namespace PrimeNumberGenerator.Infrastructure.Publishing;

/// <summary>
/// Собирает продюсеры Kafka по <see cref="KafkaOptions"/>.
/// </summary>
public sealed class KafkaProducerFactory : IKafkaProducerFactory
{
    private readonly KafkaOptions _kafkaOptions;

    /// <summary>
    /// Создаёт фабрику, привязанную к текущим настройкам Kafka.
    /// </summary>
    public KafkaProducerFactory(IOptions<KafkaOptions> kafkaOptions)
    {
        _kafkaOptions = kafkaOptions.Value;
    }

    /// <summary>
    /// Создаёт продюсер с подтверждением всех реплик без требования PID идемпотентности.
    /// </summary>
    public IProducer<string, string> Create()
    {
        var producerConfig = new ProducerConfig
        {
            BootstrapServers = _kafkaOptions.BootstrapServers,
            ClientId = _kafkaOptions.ClientId,
            Acks = Acks.All,
            EnableIdempotence = false,
            AllowAutoCreateTopics = true,
            MessageSendMaxRetries = 10,
            RetryBackoffMs = 500,
            MessageTimeoutMs = 60000,
            SocketTimeoutMs = 30000
        };

        return new ProducerBuilder<string, string>(producerConfig).Build();
    }
}
