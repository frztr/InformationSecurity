using Microsoft.Extensions.Logging;
using PrimeNumberGenerator.Application.Publishing;
using PrimeNumberGenerator.Domain.PrimeNumbers;

namespace PrimeNumberGenerator.Infrastructure.Publishing;

/// <summary>
/// Пишет сгенерированное простое число в журнал приложения.
/// </summary>
public sealed class ConsolePrimeNumberPublisher : IPrimeNumberPublisher
{
    private readonly ILogger<ConsolePrimeNumberPublisher> _logger;

    /// <summary>
    /// Создаёт публикатор, который использует <paramref name="logger"/>.
    /// </summary>
    public ConsolePrimeNumberPublisher(ILogger<ConsolePrimeNumberPublisher> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Записывает простое число в лог и сразу завершается.
    /// </summary>
    public Task PublishAsync(PrimeNumber primeNumber, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(primeNumber);
        cancellationToken.ThrowIfCancellationRequested();

        _logger.LogInformation(
            "Generated probable prime number ({BitLength} bits) at {GeneratedAt}: {PrimeNumber}",
            primeNumber.BitLength.Value,
            primeNumber.GeneratedAt,
            primeNumber.Value);

        return Task.CompletedTask;
    }
}
