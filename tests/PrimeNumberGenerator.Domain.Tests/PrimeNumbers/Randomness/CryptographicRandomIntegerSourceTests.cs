using System.Numerics;
using FluentAssertions;
using PrimeNumberGenerator.Domain.PrimeNumbers.Randomness;

namespace PrimeNumberGenerator.Domain.Tests.PrimeNumbers.Randomness;

public sealed class CryptographicRandomIntegerSourceTests
{
    private readonly CryptographicRandomIntegerSource _randomIntegerSource = new();

    [Fact]
    public void NextInclusive_ShouldReturnValuesInsideTheRequestedRange()
    {
        var inclusiveMinimum = new BigInteger(2);
        var inclusiveMaximum = new BigInteger(20);

        for (var attemptIndex = 0; attemptIndex < 128; attemptIndex++)
        {
            var value = _randomIntegerSource.NextInclusive(inclusiveMinimum, inclusiveMaximum);

            value.Should().BeGreaterThanOrEqualTo(inclusiveMinimum);
            value.Should().BeLessThanOrEqualTo(inclusiveMaximum);
        }
    }

    [Fact]
    public void NextInclusive_ShouldReturnTheOnlyPossibleValue_WhenMinimumEqualsMaximum()
    {
        var value = _randomIntegerSource.NextInclusive(7, 7);

        value.Should().Be(7);
    }

    [Fact]
    public void NextInclusive_ShouldThrow_WhenMaximumIsLessThanMinimum()
    {
        var act = () => _randomIntegerSource.NextInclusive(10, 3);

        act.Should().Throw<ArgumentOutOfRangeException>().WithParameterName("inclusiveMaximum");
    }

    [Fact]
    public void FillBytes_ShouldOverwriteTheEntireBuffer()
    {
        var buffer = new byte[32];

        _randomIntegerSource.FillBytes(buffer);

        buffer.Should().NotBeEquivalentTo(new byte[32]);
    }
}
