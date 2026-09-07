using System.Numerics;

namespace PrimeNumberGenerator.Domain.PrimeNumbers.Primality;

/// <summary>
/// Проверяет, является ли целое число вероятностно простым.
/// </summary>
public interface IPrimalityTester
{
    /// <summary>
    /// Возвращает true, если <paramref name="numberUnderTest"/> проходит заданное число раундов Миллера–Рабина.
    /// </summary>
    /// <param name="numberUnderTest">Проверяемое целое число.</param>
    /// <param name="millerRabinWitnessRoundCount">Сколько случайных свидетелей использовать.</param>
    /// <param name="cancellationToken">Токен для остановки длинной проверки.</param>
    bool IsProbablePrime(
        BigInteger numberUnderTest,
        int millerRabinWitnessRoundCount,
        CancellationToken cancellationToken);
}
