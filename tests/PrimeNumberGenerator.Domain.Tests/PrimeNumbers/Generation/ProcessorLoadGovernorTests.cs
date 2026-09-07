using FluentAssertions;
using PrimeNumberGenerator.Domain.PrimeNumbers.Generation;

namespace PrimeNumberGenerator.Domain.Tests.PrimeNumbers.Generation;

public sealed class ProcessorLoadGovernorTests
{
    [Fact]
    public void YieldToOtherProcesses_ShouldThrow_WhenCancellationIsAlreadyRequested()
    {
        var processorLoadGovernor = new ProcessorLoadGovernor();
        var processorLoadPolicy = new ProcessorLoadPolicy(50, SearchWorkerPriority.BelowNormal);
        using var cancellationTokenSource = new CancellationTokenSource();
        cancellationTokenSource.Cancel();

        var act = () => processorLoadGovernor.YieldToOtherProcesses(
            processorLoadPolicy,
            TimeSpan.FromMilliseconds(50),
            cancellationTokenSource.Token);

        act.Should().Throw<OperationCanceledException>();
    }

    [Fact]
    public void ApplyWorkerThreadPriority_ShouldRestoreOriginalPriority()
    {
        var processorLoadGovernor = new ProcessorLoadGovernor();
        var originalPriority = Thread.CurrentThread.Priority;

        using (processorLoadGovernor.ApplyWorkerThreadPriority(SearchWorkerPriority.BelowNormal))
        {
            Thread.CurrentThread.Priority.Should().Be(ThreadPriority.BelowNormal);
        }

        Thread.CurrentThread.Priority.Should().Be(originalPriority);
    }
}
