using FluentAssertions;
using PrimeNumberGenerator.Domain.PrimeNumbers.Generation;

namespace PrimeNumberGenerator.Domain.Tests.PrimeNumbers.Generation;

public sealed class ProcessorLoadPolicyTests
{
    [Fact]
    public void CalculateIdlePause_ShouldMatchDutyCycle_WhenUtilizationIsFiftyPercent()
    {
        var processorLoadPolicy = new ProcessorLoadPolicy(50, SearchWorkerPriority.BelowNormal);

        var idlePause = processorLoadPolicy.CalculateIdlePause(TimeSpan.FromMilliseconds(100));

        idlePause.Should().Be(TimeSpan.FromMilliseconds(100));
    }

    [Fact]
    public void CalculateIdlePause_ShouldBeZero_WhenUtilizationIsFull()
    {
        var idlePause = ProcessorLoadPolicy.Unthrottled.CalculateIdlePause(TimeSpan.FromMilliseconds(250));

        idlePause.Should().Be(TimeSpan.Zero);
    }

    [Fact]
    public void CalculateIdlePause_ShouldBeZero_WhenNoWorkWasMeasured()
    {
        var processorLoadPolicy = new ProcessorLoadPolicy(70, SearchWorkerPriority.BelowNormal);

        processorLoadPolicy.CalculateIdlePause(TimeSpan.Zero).Should().Be(TimeSpan.Zero);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(101)]
    [InlineData(-10)]
    public void Constructor_ShouldThrow_WhenUtilizationPercentIsOutOfRange(int maxProcessorUtilizationPercent)
    {
        var act = () => new ProcessorLoadPolicy(maxProcessorUtilizationPercent, SearchWorkerPriority.BelowNormal);

        act.Should().Throw<ArgumentOutOfRangeException>().WithParameterName("maxProcessorUtilizationPercent");
    }
}
