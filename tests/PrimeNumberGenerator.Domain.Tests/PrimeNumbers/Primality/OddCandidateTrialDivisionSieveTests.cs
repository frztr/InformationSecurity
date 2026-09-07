using System.Numerics;
using FluentAssertions;
using PrimeNumberGenerator.Domain.PrimeNumbers.Primality;

namespace PrimeNumberGenerator.Domain.Tests.PrimeNumbers.Primality;

public sealed class OddCandidateTrialDivisionSieveTests
{
    private readonly TrialDivisionFilter _trialDivisionFilter = new();

    [Theory]
    [InlineData(3)]
    [InlineData(5)]
    [InlineData(97)]
    [InlineData(104729)]
    public void CurrentSurvives_ShouldReturnTrue_ForKnownOddPrimeNumbers(int primeNumber)
    {
        var sieve = _trialDivisionFilter.CreateSieve(trialDivisionPrimeCount: 2048);
        sieve.Reset(primeNumber);

        sieve.CurrentSurvives().Should().BeTrue();
    }

    [Theory]
    [InlineData(9)]
    [InlineData(15)]
    [InlineData(25)]
    [InlineData(121)]
    [InlineData(104729 * 3)]
    public void CurrentSurvives_ShouldReturnFalse_ForKnownOddCompositeNumbers(int compositeNumber)
    {
        var sieve = _trialDivisionFilter.CreateSieve(trialDivisionPrimeCount: 2048);
        sieve.Reset(compositeNumber);

        sieve.CurrentSurvives().Should().BeFalse();
    }

    [Fact]
    public void AdvanceToNextOddCandidate_ShouldMatchFreshTrialDivision()
    {
        var startingCandidate = new BigInteger(9);
        var sieve = _trialDivisionFilter.CreateSieve(trialDivisionPrimeCount: 64);
        sieve.Reset(startingCandidate);

        for (var stepIndex = 0; stepIndex < 128; stepIndex++)
        {
            var expected = _trialDivisionFilter.SurvivesTrialDivision(sieve.Candidate, trialDivisionPrimeCount: 64);
            sieve.CurrentSurvives().Should().Be(expected, $"candidate {sieve.Candidate}");
            sieve.AdvanceToNextOddCandidate();
        }
    }

    [Fact]
    public void Reset_ShouldThrow_WhenCandidateIsEven()
    {
        var sieve = _trialDivisionFilter.CreateSieve(trialDivisionPrimeCount: 8);

        var act = () => sieve.Reset(10);

        act.Should().Throw<ArgumentException>().WithParameterName("oddCandidate");
    }
}
