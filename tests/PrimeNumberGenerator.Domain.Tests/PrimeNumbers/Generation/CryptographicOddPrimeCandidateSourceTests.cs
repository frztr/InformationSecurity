using System.Numerics;
using FluentAssertions;
using PrimeNumberGenerator.Domain.PrimeNumbers;
using PrimeNumberGenerator.Domain.PrimeNumbers.Generation;
using PrimeNumberGenerator.Domain.PrimeNumbers.Randomness;

namespace PrimeNumberGenerator.Domain.Tests.PrimeNumbers.Generation;

public sealed class CryptographicOddPrimeCandidateSourceTests
{
    private readonly CryptographicOddPrimeCandidateSource _primeCandidateSource = new(new CryptographicRandomIntegerSource());

    [Theory]
    [InlineData(8)]
    [InlineData(16)]
    [InlineData(32)]
    public void NextOddCandidate_ShouldReturnOddNumberWithExactBitLength(int bitLengthValue)
    {
        var bitLength = new BitLength(bitLengthValue);

        for (var attemptIndex = 0; attemptIndex < 64; attemptIndex++)
        {
            var candidate = _primeCandidateSource.NextOddCandidate(bitLength);

            candidate.Should().BeGreaterThan(BigInteger.One);
            (candidate % 2).Should().Be(BigInteger.One);
            candidate.GetBitLength().Should().Be(bitLengthValue);
        }
    }
}
