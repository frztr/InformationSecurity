using FluentAssertions;
using PrimeNumberGenerator.Domain.PrimeNumbers;

namespace PrimeNumberGenerator.Domain.Tests.PrimeNumbers;

public sealed class BitLengthTests
{
    [Theory]
    [InlineData(2)]
    [InlineData(8)]
    [InlineData(64)]
    [InlineData(BitLength.AssignmentRequiredValue)]
    public void Constructor_ShouldKeepTheProvidedValue_WhenTheValueIsAtLeastTwo(int value)
    {
        var bitLength = new BitLength(value);

        bitLength.Value.Should().Be(value);
    }

    [Theory]
    [InlineData(1)]
    [InlineData(0)]
    [InlineData(-1)]
    public void Constructor_ShouldThrow_WhenTheValueIsLessThanTwo(int value)
    {
        var act = () => new BitLength(value);

        act.Should().Throw<ArgumentOutOfRangeException>().WithParameterName("value");
    }

    [Fact]
    public void AssignmentRequiredValue_ShouldBe16384()
    {
        BitLength.AssignmentRequiredValue.Should().Be(16384);
    }
}
