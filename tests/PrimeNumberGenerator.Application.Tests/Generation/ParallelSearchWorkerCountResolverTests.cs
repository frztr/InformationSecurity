using FluentAssertions;
using PrimeNumberGenerator.Application.Generation;

namespace PrimeNumberGenerator.Application.Tests.Generation;

public sealed class ParallelSearchWorkerCountResolverTests
{
    [Fact]
    public void Resolve_ShouldLeaveReservedCoresIdle_WhenConfiguredWorkerCountIsZero()
    {
        var resolvedWorkerCount = ParallelSearchWorkerCountResolver.Resolve(
            configuredWorkerCount: 0,
            availableProcessorCount: 8,
            reservedIdleProcessorCount: 1);

        resolvedWorkerCount.Should().Be(7);
    }

    [Fact]
    public void Resolve_ShouldKeepAtLeastOneWorker_WhenEveryCoreWouldBeReserved()
    {
        var resolvedWorkerCount = ParallelSearchWorkerCountResolver.Resolve(
            configuredWorkerCount: 0,
            availableProcessorCount: 4,
            reservedIdleProcessorCount: 4);

        resolvedWorkerCount.Should().Be(1);
    }

    [Fact]
    public void Resolve_ShouldUseConfiguredWorkerCount_WhenItIsGreaterThanZero()
    {
        var resolvedWorkerCount = ParallelSearchWorkerCountResolver.Resolve(
            configuredWorkerCount: 3,
            availableProcessorCount: 16,
            reservedIdleProcessorCount: 1);

        resolvedWorkerCount.Should().Be(3);
    }

    [Fact]
    public void Resolve_ShouldUseAllCores_WhenNoCoresAreReserved()
    {
        var resolvedWorkerCount = ParallelSearchWorkerCountResolver.Resolve(
            configuredWorkerCount: 0,
            availableProcessorCount: 8,
            reservedIdleProcessorCount: 0);

        resolvedWorkerCount.Should().Be(8);
    }

    [Fact]
    public void Resolve_ShouldThrow_WhenConfiguredWorkerCountIsNegative()
    {
        var act = () => ParallelSearchWorkerCountResolver.Resolve(
            configuredWorkerCount: -1,
            availableProcessorCount: 8,
            reservedIdleProcessorCount: 1);

        act.Should().Throw<ArgumentOutOfRangeException>().WithParameterName("configuredWorkerCount");
    }

    [Fact]
    public void Resolve_ShouldThrow_WhenAvailableProcessorCountIsLessThanOne()
    {
        var act = () => ParallelSearchWorkerCountResolver.Resolve(
            configuredWorkerCount: 0,
            availableProcessorCount: 0,
            reservedIdleProcessorCount: 0);

        act.Should().Throw<ArgumentOutOfRangeException>().WithParameterName("availableProcessorCount");
    }

    [Fact]
    public void Resolve_ShouldThrow_WhenReservedIdleProcessorCountIsNegative()
    {
        var act = () => ParallelSearchWorkerCountResolver.Resolve(
            configuredWorkerCount: 0,
            availableProcessorCount: 8,
            reservedIdleProcessorCount: -1);

        act.Should().Throw<ArgumentOutOfRangeException>().WithParameterName("reservedIdleProcessorCount");
    }
}
