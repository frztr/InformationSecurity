using System.Numerics;
using FluentAssertions;
using PrimeNumberGenerator.Domain.PrimeNumbers;

namespace PrimeNumberGenerator.Domain.Tests.PrimeNumbers;

public sealed class PrimeNumberTests
{
    [Fact]
    public void Create_ShouldReturnPrimeNumber_WhenValueMatchesExpectedBitLength()
    {
        var expectedBitLength = new BitLength(5);
        var generatedAt = DateTimeOffset.UtcNow;

        var primeNumber = PrimeNumber.Create(17, expectedBitLength, generatedAt);

        primeNumber.Value.Should().Be(17);
        primeNumber.BitLength.Should().Be(expectedBitLength);
        primeNumber.GeneratedAt.Should().Be(generatedAt);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(1)]
    [InlineData(-3)]
    public void Create_ShouldThrow_WhenValueIsLessThanTwo(int value)
    {
        var act = () => PrimeNumber.Create(value, new BitLength(8), DateTimeOffset.UtcNow);

        act.Should().Throw<ArgumentOutOfRangeException>().WithParameterName("value");
    }

    [Fact]
    public void Create_ShouldThrow_WhenActualBitLengthDoesNotMatchExpectedBitLength()
    {
        var act = () => PrimeNumber.Create(17, new BitLength(8), DateTimeOffset.UtcNow);

        act.Should().Throw<ArgumentException>().WithParameterName("value");
    }

    [Fact]
    public void Create_ShouldAcceptTwo()
    {
        var primeNumber = PrimeNumber.Create(2, new BitLength(2), DateTimeOffset.UtcNow);

        primeNumber.Value.Should().Be(new BigInteger(2));
    }
}
