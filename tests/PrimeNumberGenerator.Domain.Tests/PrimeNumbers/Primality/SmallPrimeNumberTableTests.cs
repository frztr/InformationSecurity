using FluentAssertions;
using PrimeNumberGenerator.Domain.PrimeNumbers.Primality;

namespace PrimeNumberGenerator.Domain.Tests.PrimeNumbers.Primality;

public sealed class SmallPrimeNumberTableTests
{
    [Fact]
    public void FirstPrimeNumbers_ShouldStartWithTheSmallestPrimes()
    {
        SmallPrimeNumberTable.FirstPrimeNumbers.Should().StartWith(new[] { 2, 3, 5, 7, 11, 13, 17, 19, 23, 29 });
    }

    [Fact]
    public void FirstPrimeNumbers_ShouldContainExactlyTheConfiguredCount()
    {
        SmallPrimeNumberTable.FirstPrimeNumbers.Should().HaveCount(SmallPrimeNumberTable.MaximumSupportedPrimeCount);
    }

    [Fact]
    public void FirstPrimeNumbers_ShouldContainTheKnown10000thPrime()
    {
        SmallPrimeNumberTable.FirstPrimeNumbers[^1].Should().Be(104729);
    }
}
