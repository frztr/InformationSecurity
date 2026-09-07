using PrimeNumberGenerator.Domain.PrimeNumbers;

namespace PrimeNumberGenerator.Application.Publishing;

/// <summary>
/// Публикует сгенерированное простое число в выбранный канал.
/// </summary>
public interface IPrimeNumberPublisher
{
    /// <summary>
    /// Отправляет <paramref name="primeNumber"/> в настроенный канал.
    /// </summary>
    Task PublishAsync(PrimeNumber primeNumber, CancellationToken cancellationToken);
}
