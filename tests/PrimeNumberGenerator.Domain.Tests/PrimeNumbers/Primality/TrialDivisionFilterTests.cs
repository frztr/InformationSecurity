using System.Numerics;
using FluentAssertions;
using PrimeNumberGenerator.Domain.PrimeNumbers.Primality;

namespace PrimeNumberGenerator.Domain.Tests.PrimeNumbers.Primality;

public sealed class TrialDivisionFilterTests
{
    private readonly TrialDivisionFilter _trialDivisionFilter = new();

    [Theory]
    [InlineData(2)]
    [InlineData(3)]
    [InlineData(5)]
    [InlineData(97)]
    [InlineData(104729)]
    public void SurvivesTrialDivision_ShouldReturnTrue_ForKnownPrimeNumbers(int primeNumber)
    {
        var survives = _trialDivisionFilter.SurvivesTrialDivision(primeNumber, trialDivisionPrimeCount: 2048);

        survives.Should().BeTrue();
    }

    [Theory]
    [InlineData(1)]
    [InlineData(4)]
    [InlineData(9)]
    [InlineData(15)]
    [InlineData(25)]
    [InlineData(121)]
    [InlineData(104729 * 2)]
    public void SurvivesTrialDivision_ShouldReturnFalse_ForKnownCompositeNumbers(int compositeNumber)
    {
        var survives = _trialDivisionFilter.SurvivesTrialDivision(compositeNumber, trialDivisionPrimeCount: 2048);

        survives.Should().BeFalse();
    }

    [Fact]
    public void SurvivesTrialDivision_ShouldReturnTrue_WhenCandidateIsNotDivisibleByTheConfiguredSmallPrimes()
    {
        var largeOddCompositeBuiltFromPrimesOutsideTheTable = BigInteger.Pow(104743, 2);

        var survives = _trialDivisionFilter.SurvivesTrialDivision(
            largeOddCompositeBuiltFromPrimesOutsideTheTable,
            trialDivisionPrimeCount: 16);

        survives.Should().BeTrue();
    }
}
