namespace PrimeNumberGenerator.Domain.PrimeNumbers.Generation;

/// <summary>
/// Генерирует вероятностно простое число заданной битовой длины.
/// </summary>
public interface IPrimeNumberGenerator
{
    /// <summary>
    /// Ищет число, пока не найдёт вероятностно простое или пока не сработает <paramref name="cancellationToken"/>.
    /// </summary>
    Task<PrimeNumber> GenerateAsync(
        int bitLength,
        PrimeGenerationParameters generationParameters,
        CancellationToken cancellationToken);
}
