namespace PrimeNumberGenerator.Application.Publishing;

/// <summary>
/// Куда отправляется сгенерированное простое число.
/// </summary>
public enum PublishingDestination
{
    /// <summary>
    /// Записать число в журнал приложения.
    /// </summary>
    Console = 0,

    /// <summary>
    /// Опубликовать число JSON-сообщением в Kafka.
    /// </summary>
    Kafka = 1
}
