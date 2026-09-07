namespace PrimeNumberGenerator.Infrastructure.Publishing;

/// <summary>
/// JSON-сообщение, которое записывается в топик Kafka.
/// </summary>
public sealed class PrimeNumberPublishedMessage
{
    /// <summary>
    /// Десятичная запись простого числа.
    /// </summary>
    public required string DecimalValue { get; init; }

    /// <summary>
    /// Битовая длина числа.
    /// </summary>
    public required int BitLength { get; init; }

    /// <summary>
    /// Время генерации по UTC.
    /// </summary>
    public required DateTimeOffset GeneratedAtUtc { get; init; }
}
