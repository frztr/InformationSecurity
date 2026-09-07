using PrimeNumberGenerator.Application.Publishing;

namespace PrimeNumberGenerator.Application.Configuration;

/// <summary>
/// Секция YAML, которая выбирает канал публикации.
/// </summary>
public sealed class PublishingOptions
{
    /// <summary>
    /// Имя секции конфигурации.
    /// </summary>
    public const string SectionName = "Publishing";

    /// <summary>
    /// Console или Kafka.
    /// </summary>
    public PublishingDestination Destination { get; set; } = PublishingDestination.Console;
}
