using System.Text.Json;
using Confluent.Kafka;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using PrimeNumberGenerator.Application.Configuration;
using PrimeNumberGenerator.Application.Publishing;
using PrimeNumberGenerator.Domain.PrimeNumbers;

namespace PrimeNumberGenerator.Infrastructure.Publishing;

/// <summary>
/// Публикует простое число в виде JSON в настроенный топик Kafka.
/// Продюсер потокобезопасен: несколько поисков могут вызывать <see cref="PublishAsync"/> одновременно.
/// </summary>
public sealed class KafkaPrimeNumberPublisher(
    IOptions<KafkaOptions> kafkaOptions,
    ILogger<KafkaPrimeNumberPublisher> logger,
    IProducer<string, string>? producer = null)
    : IPrimeNumberPublisher, IDisposable
{
    private static readonly JsonSerializerOptions JsonSerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    private readonly KafkaOptions _kafkaOptions = kafkaOptions.Value;
    private readonly Lazy<IProducer<string, string>> _producer = new(() =>
        producer ?? CreateProducer(kafkaOptions.Value));

    /// <summary>
    /// Сериализует <paramref name="primeNumber"/> и отправляет его в Kafka.
    /// </summary>
    public async Task PublishAsync(PrimeNumber primeNumber, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(primeNumber);

        PrimeNumberPublishedMessage publishedMessage = new PrimeNumberPublishedMessage
        {
            DecimalValue = primeNumber.Value.ToString(),
            BitLength = primeNumber.BitLength,
            GeneratedAtUtc = primeNumber.GeneratedAt.ToUniversalTime()
        };

        string serializedMessage = JsonSerializer.Serialize(publishedMessage, JsonSerializerOptions);
        Message<string, string> kafkaMessage = new Message<string, string>
        {
            Key = primeNumber.BitLength.ToString(),
            Value = serializedMessage
        };

        DeliveryResult<string, string> deliveryResult = await _producer.Value.ProduceAsync(
            _kafkaOptions.Topic,
            kafkaMessage,
            cancellationToken);

        logger.LogInformation(
            "Published a {BitLength}-bit prime number to Kafka topic {Topic} at offset {Offset}.",
            primeNumber.BitLength,
            deliveryResult.Topic,
            deliveryResult.Offset.Value);
    }

    /// <summary>
    /// Сбрасывает буфер и освобождает продюсер, если он был создан.
    /// </summary>
    public void Dispose()
    {
        if (!_producer.IsValueCreated)
        {
            return;
        }

        _producer.Value.Flush(TimeSpan.FromSeconds(5));
        _producer.Value.Dispose();
    }

    /// <summary>
    /// Собирает продюсер с подтверждением всех реплик без требования PID идемпотентности.
    /// </summary>
    private static IProducer<string, string> CreateProducer(KafkaOptions kafkaOptions)
    {
        ProducerConfig producerConfig = new ProducerConfig
        {
            BootstrapServers = kafkaOptions.BootstrapServers,
            ClientId = kafkaOptions.ClientId,
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
