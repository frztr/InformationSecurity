using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using NSubstitute;
using PrimeNumberGenerator.Application.Configuration;
using PrimeNumberGenerator.Application.Generation;
using PrimeNumberGenerator.Application.Publishing;
using PrimeNumberGenerator.Domain.PrimeNumbers;
using PrimeNumberGenerator.Domain.PrimeNumbers.Generation;

namespace PrimeNumberGenerator.Application.Tests.Generation;

public sealed class PrimeNumberGenerationProcessorTests
{
    [Fact]
    public async Task GenerateAndPublishUntilCancelledAsync_ShouldPublishEachFoundPrimeNumber()
    {
        var generatedPrimeNumber = PrimeNumber.Create(17, new BitLength(5), DateTimeOffset.UtcNow);
        using var cancellationTokenSource = new CancellationTokenSource();
        var primeNumberGenerator = Substitute.For<IPrimeNumberGenerator>();
        primeNumberGenerator
            .GenerateAsync(Arg.Any<BitLength>(), Arg.Any<PrimeGenerationParameters>(), Arg.Any<CancellationToken>())
            .Returns(generatedPrimeNumber);

        var primeNumberPublisher = Substitute.For<IPrimeNumberPublisher>();
        primeNumberPublisher
            .PublishAsync(generatedPrimeNumber, Arg.Any<CancellationToken>())
            .Returns(_ =>
            {
                cancellationTokenSource.Cancel();
                return Task.CompletedTask;
            });

        var generationOptions = Options.Create(new PrimeNumberGenerationOptions
        {
            BitLength = 5,
            MillerRabinWitnessRoundCount = 8,
            TrialDivisionPrimeCount = 16,
            ParallelSearchWorkerCount = 1,
            PauseBetweenGenerations = TimeSpan.Zero
        });

        var processor = new PrimeNumberGenerationProcessor(
            primeNumberGenerator,
            primeNumberPublisher,
            generationOptions,
            NullLogger<PrimeNumberGenerationProcessor>.Instance);

        await processor.GenerateAndPublishUntilCancelledAsync(cancellationTokenSource.Token);

        await primeNumberPublisher.Received().PublishAsync(generatedPrimeNumber, Arg.Any<CancellationToken>());
        await primeNumberGenerator.Received().GenerateAsync(
            Arg.Is<BitLength>(bitLength => bitLength.Value == 5),
            Arg.Is<PrimeGenerationParameters>(parameters =>
                parameters.MillerRabinWitnessRoundCount == 8
                && parameters.TrialDivisionPrimeCount == 16),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task GenerateAndPublishUntilCancelledAsync_ShouldRunIndependentSearchesInParallel()
    {
        const int independentSearchWorkerCount = 3;
        using var cancellationTokenSource = new CancellationTokenSource();
        var allWorkersStarted = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var startedWorkerCount = 0;

        var primeNumberGenerator = Substitute.For<IPrimeNumberGenerator>();
        primeNumberGenerator
            .GenerateAsync(Arg.Any<BitLength>(), Arg.Any<PrimeGenerationParameters>(), Arg.Any<CancellationToken>())
            .Returns(async callInfo =>
            {
                if (Interlocked.Increment(ref startedWorkerCount) == independentSearchWorkerCount)
                {
                    allWorkersStarted.TrySetResult();
                }

                var workerCancellationToken = callInfo.Arg<CancellationToken>();
                await Task.Delay(Timeout.Infinite, workerCancellationToken);
                throw new OperationCanceledException(workerCancellationToken);
            });

        var processor = new PrimeNumberGenerationProcessor(
            primeNumberGenerator,
            Substitute.For<IPrimeNumberPublisher>(),
            Options.Create(new PrimeNumberGenerationOptions
            {
                BitLength = 5,
                MillerRabinWitnessRoundCount = 8,
                TrialDivisionPrimeCount = 16,
                ParallelSearchWorkerCount = independentSearchWorkerCount,
                PauseBetweenGenerations = TimeSpan.Zero
            }),
            NullLogger<PrimeNumberGenerationProcessor>.Instance);

        var processingTask = processor.GenerateAndPublishUntilCancelledAsync(cancellationTokenSource.Token);

        await allWorkersStarted.Task.WaitAsync(TimeSpan.FromSeconds(5));
        startedWorkerCount.Should().Be(independentSearchWorkerCount);

        cancellationTokenSource.Cancel();
        await processingTask;
    }
}
