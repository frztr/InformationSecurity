using System.Numerics;
using PrimeNumberGenerator.Domain.PrimeNumbers.Randomness;

namespace PrimeNumberGenerator.Domain.PrimeNumbers.Generation;

/// <summary>
/// Cоздаёт нечётных кандидатов из криптографически стойких случайных байт.
/// </summary>
public sealed class CryptographicOddPrimeCandidateSource(IRandomIntegerSource randomIntegerSource)
    : IPrimeCandidateSource
{
    /// <summary>
    /// Возвращает случайное нечётное число со старшим битом, чтобы длина была ровно <paramref name="bitLength"/> бит.
    /// </summary>
    public BigInteger NextOddCandidate(int bitLength)
    {
        if (bitLength < 2)
        {
            throw new ArgumentOutOfRangeException(
                nameof(bitLength),
                bitLength,
                "Bit length must be at least 2.");
        }

        int byteCount = (bitLength + 7) / 8;
        byte[] randomBytes = new byte[byteCount];
        randomIntegerSource.FillBytes(randomBytes);

        BigInteger candidate = new BigInteger(randomBytes, isUnsigned: true, isBigEndian: true);
        BigInteger bitMask = (BigInteger.One << bitLength) - BigInteger.One;
        candidate &= bitMask;
        candidate |= BigInteger.One << (bitLength - 1);
        candidate |= BigInteger.One;

        return candidate;
    }
}
