using System.Numerics;
using PrimeNumberGenerator.Domain.PrimeNumbers.Randomness;

namespace PrimeNumberGenerator.Domain.PrimeNumbers.Primality;

/// <summary>
/// Вероятностный тест Миллера–Рабина со случайными свидетелями.
/// </summary>
public sealed class MillerRabinPrimalityTester(IRandomIntegerSource randomIntegerSource) : IPrimalityTester
{
    /// <summary>
    /// Возвращает true, если число равно 2 или 3 либо проходит все раунды Миллера–Рабина.
    /// </summary>
    public bool IsProbablePrime(
        BigInteger numberUnderTest,
        int millerRabinWitnessRoundCount,
        CancellationToken cancellationToken)
    {
        if (millerRabinWitnessRoundCount < 1)
        {
            throw new ArgumentOutOfRangeException(
                nameof(millerRabinWitnessRoundCount),
                millerRabinWitnessRoundCount,
                "Тест Миллера–Рабина должен использовать хотя бы один раунд со свидетелем.");
        }

        if (numberUnderTest < 2)
        {
            return false;
        }

        if (numberUnderTest == 2 || numberUnderTest == 3)
        {
            return true;
        }

        if (numberUnderTest % 2 == 0)
        {
            return false;
        }

        BigInteger numberUnderTestMinusOne = numberUnderTest - BigInteger.One;
        int powerOfTwoExponent = 0;
        BigInteger oddComponent = numberUnderTestMinusOne;

        while (oddComponent % 2 == 0)
        {
            oddComponent /= 2;
            powerOfTwoExponent++;
        }

        for (int roundIndex = 0; roundIndex < millerRabinWitnessRoundCount; roundIndex++)
        {
            cancellationToken.ThrowIfCancellationRequested();

            BigInteger witness = randomIntegerSource.NextInclusive(2, numberUnderTest - 2);
            BigInteger modularPower = BigInteger.ModPow(witness, oddComponent, numberUnderTest);

            if (modularPower == BigInteger.One || modularPower == numberUnderTestMinusOne)
            {
                continue;
            }

            bool currentRoundPassed = false;
            for (int squaringIndex = 1; squaringIndex < powerOfTwoExponent; squaringIndex++)
            {
                modularPower = BigInteger.ModPow(modularPower, 2, numberUnderTest);
                if (modularPower == numberUnderTestMinusOne)
                {
                    currentRoundPassed = true;
                    break;
                }
            }

            if (!currentRoundPassed)
            {
                return false;
            }
        }

        return true;
    }
}
