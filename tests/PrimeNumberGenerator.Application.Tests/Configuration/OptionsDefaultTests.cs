using FluentAssertions;
using PrimeNumberGenerator.Application.Configuration;
using PrimeNumberGenerator.Domain.PrimeNumbers.Generation;

namespace PrimeNumberGenerator.Application.Tests.Configuration;

public sealed class OptionsDefaultTests
{
    [Fact]
    public void PrimeNumberGenerationOptions_ShouldDefaultTo16384BitLength()
    {
        PrimeNumberGenerationOptions generationOptions = new PrimeNumberGenerationOptions();

        generationOptions.BitLength.Should().Be(16384);
        generationOptions.MillerRabinWitnessRoundCount.Should().Be(3);
        generationOptions.TrialDivisionPrimeCount.Should().Be(10000);
        generationOptions.PauseBetweenGenerations.Should().Be(TimeSpan.Zero);
        generationOptions.ParallelSearchWorkerCount.Should().Be(0);
        generationOptions.ReservedIdleProcessorCount.Should().Be(1);
        generationOptions.MaxProcessorUtilizationPercent.Should().Be(100);
        generationOptions.WorkerThreadPriority.Should().Be(SearchWorkerPriority.BelowNormal);
    }
}
