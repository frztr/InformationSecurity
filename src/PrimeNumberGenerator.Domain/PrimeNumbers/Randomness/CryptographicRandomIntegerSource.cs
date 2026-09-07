using System.Numerics;
using System.Security.Cryptography;

namespace PrimeNumberGenerator.Domain.PrimeNumbers.Randomness;

/// <summary>
/// Источник случайных целых чисел на основе <see cref="RandomNumberGenerator"/>.
/// </summary>
public sealed class CryptographicRandomIntegerSource : IRandomIntegerSource
{
    private static readonly ThreadLocal<RandomNumberGenerator> RandomNumberGeneratorPerThread = new(
        RandomNumberGenerator.Create);

    /// <summary>
    /// Заполняет <paramref name="buffer"/> криптографически стойкими случайными байтами.
    /// </summary>
    public void FillBytes(byte[] buffer)
    {
        RandomNumberGeneratorPerThread.Value!.GetBytes(buffer);
    }

    /// <summary>
    /// Возвращает равномерно выбранное целое число в запрошенном замкнутом диапазоне.
    /// </summary>
    public BigInteger NextInclusive(BigInteger inclusiveMinimum, BigInteger inclusiveMaximum)
    {
        if (inclusiveMaximum < inclusiveMinimum)
        {
            throw new ArgumentOutOfRangeException(
                nameof(inclusiveMaximum),
                inclusiveMaximum,
                "Верхняя граница включительно должна быть не меньше нижней.");
        }

        var rangeSize = inclusiveMaximum - inclusiveMinimum + BigInteger.One;
        var randomOffset = NextExclusiveUpperBound(rangeSize);
        return inclusiveMinimum + randomOffset;
    }

    /// <summary>
    /// Возвращает неотрицательное целое число строго меньше <paramref name="exclusiveUpperBound"/>.
    /// </summary>
    private BigInteger NextExclusiveUpperBound(BigInteger exclusiveUpperBound)
    {
        if (exclusiveUpperBound <= BigInteger.Zero)
        {
            throw new ArgumentOutOfRangeException(
                nameof(exclusiveUpperBound),
                exclusiveUpperBound,
                "Верхняя граница исключительно должна быть больше нуля.");
        }

        var byteCount = exclusiveUpperBound.GetByteCount(isUnsigned: true);
        var buffer = new byte[byteCount];
        var bitLength = exclusiveUpperBound.GetBitLength();
        var excessBitCount = (int)(byteCount * 8 - bitLength);

        BigInteger candidate;
        do
        {
            FillBytes(buffer);
            candidate = new BigInteger(buffer, isUnsigned: true, isBigEndian: true);
            if (excessBitCount > 0)
            {
                candidate >>= excessBitCount;
            }
        }
        while (candidate >= exclusiveUpperBound);

        return candidate;
    }
}
