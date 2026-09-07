namespace PrimeNumberGenerator.Application.Configuration;

/// <summary>
/// Секция YAML с параметрами подключения к Kafka.
/// </summary>
public sealed class KafkaOptions
{
    /// <summary>
    /// Имя секции конфигурации.
    /// </summary>
    public const string SectionName = "Kafka";

    /// <summary>
    /// Адрес брокера, например localhost:9094 или kafka:9092.
    /// </summary>
    public string BootstrapServers { get; set; } = "localhost:9094";

    /// <summary>
    /// Топик, в который попадают сгенерированные простые числа.
    /// </summary>
    public string Topic { get; set; } = "prime-numbers";

    /// <summary>
    /// Идентификатор клиента, который отправляется брокеру.
    /// </summary>
    public string ClientId { get; set; } = "prime-number-generator";
}
