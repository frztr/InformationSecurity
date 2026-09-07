using System.Numerics;

namespace PrimeNumberGenerator.Domain.PrimeNumbers.Generation;

/// <summary>
/// Выдаёт случайные нечётные целые числа заданной битовой длины для проверки на простоту.
/// </summary>
public interface IPrimeCandidateSource
{
    /// <summary>
    /// Возвращает нечётное число со старшим битом, чтобы длина совпадала с <paramref name="bitLength"/>.
    /// </summary>
    BigInteger NextOddCandidate(BitLength bitLength);
}
