using System.Numerics;

namespace PrimeNumberGenerator.Domain.PrimeNumbers.Primality;

/// <summary>
/// Отсекает составные кандидаты, которые делятся на малое простое число.
/// </summary>
public sealed class TrialDivisionFilter
{
    private static readonly BigInteger[] SmallPrimeNumbersAsBigInteger = CreateSmallPrimeNumbersAsBigInteger();

    /// <summary>
    /// Создаёт решето, которое обновляет остатки при шаге кандидата на +2.
    /// </summary>
    public OddCandidateTrialDivisionSieve CreateSieve(int trialDivisionPrimeCount)
    {
        return new OddCandidateTrialDivisionSieve(trialDivisionPrimeCount);
    }

    /// <summary>
    /// Возвращает true, если кандидат сам является малым простым
    /// или не делится на заданное число малых простых из таблицы.
    /// </summary>
    /// <param name="candidate">Проверяемое целое число.</param>
    /// <param name="trialDivisionPrimeCount">Сколько чисел из <see cref="SmallPrimeNumberTable"/> использовать.</param>
    public bool SurvivesTrialDivision(BigInteger candidate, int trialDivisionPrimeCount)
    {
        if (candidate < 2)
        {
            return false;
        }

        for (var primeIndex = 0; primeIndex < trialDivisionPrimeCount; primeIndex++)
        {
            var smallPrimeNumberAsBigInteger = SmallPrimeNumbersAsBigInteger[primeIndex];

            if (candidate == smallPrimeNumberAsBigInteger)
            {
                return true;
            }

            if (candidate % smallPrimeNumberAsBigInteger == BigInteger.Zero)
            {
                return false;
            }
        }

        return true;
    }

    /// <summary>
    /// Кэширует малые простые как <see cref="BigInteger"/>, чтобы не создавать их в горячем цикле.
    /// </summary>
    private static BigInteger[] CreateSmallPrimeNumbersAsBigInteger()
    {
        var smallPrimeNumbersAsBigInteger = new BigInteger[SmallPrimeNumberTable.MaximumSupportedPrimeCount];
        for (var primeIndex = 0; primeIndex < smallPrimeNumbersAsBigInteger.Length; primeIndex++)
        {
            smallPrimeNumbersAsBigInteger[primeIndex] = SmallPrimeNumberTable.FirstPrimeNumbers[primeIndex];
        }

        return smallPrimeNumbersAsBigInteger;
    }
}
