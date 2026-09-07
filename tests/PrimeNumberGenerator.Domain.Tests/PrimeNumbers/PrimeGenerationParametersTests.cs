using FluentAssertions;
using PrimeNumberGenerator.Domain.PrimeNumbers;
using PrimeNumberGenerator.Domain.PrimeNumbers.Generation;
using PrimeNumberGenerator.Domain.PrimeNumbers.Primality;

namespace PrimeNumberGenerator.Domain.Tests.PrimeNumbers;

public sealed class PrimeGenerationParametersTests
{
    [Fact]
    public void Constructor_ShouldKeepTheProvidedValues()
    {
        var generationParameters = new PrimeGenerationParameters(
            millerRabinWitnessRoundCount: 8,
            trialDivisionPrimeCount: 128);

        generationParameters.MillerRabinWitnessRoundCount.Should().Be(8);
        generationParameters.TrialDivisionPrimeCount.Should().Be(128);
        generationParameters.ProcessorLoadPolicy.Should().BeSameAs(ProcessorLoadPolicy.Unthrottled);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Constructor_ShouldThrow_WhenMillerRabinWitnessRoundCountIsLessThanOne(int millerRabinWitnessRoundCount)
    {
        var act = () => new PrimeGenerationParameters(millerRabinWitnessRoundCount, trialDivisionPrimeCount: 8);

        act.Should().Throw<ArgumentOutOfRangeException>().WithParameterName("millerRabinWitnessRoundCount");
    }

    [Theory]
    [InlineData(0)]
    [InlineData(SmallPrimeNumberTable.MaximumSupportedPrimeCount + 1)]
    public void Constructor_ShouldThrow_WhenTrialDivisionPrimeCountIsOutOfRange(int trialDivisionPrimeCount)
    {
        var act = () => new PrimeGenerationParameters(millerRabinWitnessRoundCount: 4, trialDivisionPrimeCount);

        act.Should().Throw<ArgumentOutOfRangeException>().WithParameterName("trialDivisionPrimeCount");
    }
}
