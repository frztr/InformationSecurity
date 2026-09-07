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
public sealed class KafkaPrimeNumberPublisher : IPrimeNumberPublisher, IDisposable
{
    private static readonly JsonSerializerOptions JsonSerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    private readonly Lazy<IProducer<string, string>> _producer;
    private readonly KafkaOptions _kafkaOptions;
    private readonly ILogger<KafkaPrimeNumberPublisher> _logger;

    /// <summary>
    /// Создаёт публикатор, который собирает продюсер Kafka при первой отправке.
    /// </summary>
    public KafkaPrimeNumberPublisher(
        IKafkaProducerFactory kafkaProducerFactory,
        IOptions<KafkaOptions> kafkaOptions,
        ILogger<KafkaPrimeNumberPublisher> logger)
    {
        _producer = new Lazy<IProducer<string, string>>(kafkaProducerFactory.Create);
        _kafkaOptions = kafkaOptions.Value;
        _logger = logger;
    }

    /// <summary>
    /// Сериализует <paramref name="primeNumber"/> и отправляет его в Kafka.
    /// </summary>
    public async Task PublishAsync(PrimeNumber primeNumber, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(primeNumber);

        var publishedMessage = new PrimeNumberPublishedMessage
        {
            DecimalValue = primeNumber.Value.ToString(),
            BitLength = primeNumber.BitLength.Value,
            GeneratedAtUtc = primeNumber.GeneratedAt.ToUniversalTime()
        };

        var serializedMessage = JsonSerializer.Serialize(publishedMessage, JsonSerializerOptions);
        var kafkaMessage = new Message<string, string>
        {
            Key = primeNumber.BitLength.Value.ToString(),
            Value = serializedMessage
        };

        var deliveryResult = await _producer.Value.ProduceAsync(_kafkaOptions.Topic, kafkaMessage, cancellationToken);

        _logger.LogInformation(
            "Published a {BitLength}-bit prime number to Kafka topic {Topic} at offset {Offset}.",
            primeNumber.BitLength.Value,
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
}
