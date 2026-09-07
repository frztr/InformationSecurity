using System.Numerics;
using PrimeNumberGenerator.Domain.PrimeNumbers.Randomness;

namespace PrimeNumberGenerator.Domain.PrimeNumbers.Generation;

/// <summary>
/// Строит нечётных кандидатов из криптографически стойких случайных байт.
/// </summary>
public sealed class CryptographicOddPrimeCandidateSource : IPrimeCandidateSource
{
    private readonly IRandomIntegerSource _randomIntegerSource;

    /// <summary>
    /// Создаёт источник кандидатов, который берёт случайные байты из <paramref name="randomIntegerSource"/>.
    /// </summary>
    public CryptographicOddPrimeCandidateSource(IRandomIntegerSource randomIntegerSource)
    {
        _randomIntegerSource = randomIntegerSource;
    }

    /// <summary>
    /// Возвращает случайное нечётное число со старшим битом, чтобы длина была ровно <paramref name="bitLength"/> бит.
    /// </summary>
    public BigInteger NextOddCandidate(BitLength bitLength)
    {
        var byteCount = (bitLength.Value + 7) / 8;
        var randomBytes = new byte[byteCount];
        _randomIntegerSource.FillBytes(randomBytes);

        var candidate = new BigInteger(randomBytes, isUnsigned: true, isBigEndian: true);
        var bitMask = (BigInteger.One << bitLength.Value) - BigInteger.One;
        candidate &= bitMask;
        candidate |= BigInteger.One << (bitLength.Value - 1);
        candidate |= BigInteger.One;

        return candidate;
    }
}
