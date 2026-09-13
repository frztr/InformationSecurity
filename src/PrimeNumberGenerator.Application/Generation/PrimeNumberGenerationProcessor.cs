using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using PrimeNumberGenerator.Application.Configuration;
using PrimeNumberGenerator.Application.Publishing;
using PrimeNumberGenerator.Domain.PrimeNumbers;
using PrimeNumberGenerator.Domain.PrimeNumbers.Generation;

namespace PrimeNumberGenerator.Application.Generation;

/// <summary>
/// Запускает независимые потоки поиска: каждый находит простые числа и публикует их.
/// </summary>
public sealed class PrimeNumberGenerationProcessor(
    IPrimeNumberGenerator primeNumberGenerator,
    IPrimeNumberPublisher primeNumberPublisher,
    IOptions<PrimeNumberGenerationOptions> generationOptions,
    ILogger<PrimeNumberGenerationProcessor> logger)
{
    private readonly PrimeNumberGenerationOptions _generationOptions = generationOptions.Value;

    /// <summary>
    /// Держит несколько независимых поисков, пока не сработает <paramref name="cancellationToken"/>.
    /// Каждый поток публикует число сразу после нахождения и не отменяет остальные.
    /// </summary>
    public async Task GenerateAndPublishUntilCancelledAsync(CancellationToken cancellationToken)
    {
        int bitLength = _generationOptions.BitLength;
        int independentSearchWorkerCount = ParallelSearchWorkerCountResolver.Resolve(
            _generationOptions.ParallelSearchWorkerCount,
            Environment.ProcessorCount,
            _generationOptions.ReservedIdleProcessorCount);
        ProcessorLoadPolicy processorLoadPolicy = new ProcessorLoadPolicy(
            _generationOptions.MaxProcessorUtilizationPercent,
            _generationOptions.WorkerThreadPriority);
        PrimeGenerationParameters generationParameters = new PrimeGenerationParameters(
            _generationOptions.MillerRabinWitnessRoundCount,
            _generationOptions.TrialDivisionPrimeCount,
            processorLoadPolicy);

        logger.LogInformation(
            "Starting {IndependentSearchWorkerCount} independent {BitLength}-bit prime number searches at {MaxProcessorUtilizationPercent}% utilization with {WorkerThreadPriority} priority. Reserved idle cores: {ReservedIdleProcessorCount}.",
            independentSearchWorkerCount,
            bitLength,
            processorLoadPolicy.MaxProcessorUtilizationPercent,
            processorLoadPolicy.WorkerThreadPriority,
            _generationOptions.ReservedIdleProcessorCount);

        Task[] searchTasks = new Task[independentSearchWorkerCount];
        for (int workerIndex = 0; workerIndex < independentSearchWorkerCount; workerIndex++)
        {
            searchTasks[workerIndex] = GenerateAndPublishOnIndependentWorkerAsync(
                bitLength,
                generationParameters,
                cancellationToken);
        }

        await Task.WhenAll(searchTasks);
    }

    /// <summary>
    /// В цикле ищет одно простое число, публикует его и продолжает, не трогая другие потоки.
    /// </summary>
    private async Task GenerateAndPublishOnIndependentWorkerAsync(
        int bitLength,
        PrimeGenerationParameters generationParameters,
        CancellationToken cancellationToken)
    {
        while (!cancellationToken.IsCancellationRequested)
        {
            try
            {
                PrimeNumber primeNumber = await primeNumberGenerator.GenerateAsync(
                    bitLength,
                    generationParameters,
                    cancellationToken);

                await primeNumberPublisher.PublishAsync(primeNumber, cancellationToken);

                logger.LogInformation(
                    "Published a {BitLength}-bit probable prime number.",
                    primeNumber.BitLength);

                if (_generationOptions.PauseBetweenGenerations > TimeSpan.Zero)
                {
                    await Task.Delay(_generationOptions.PauseBetweenGenerations, cancellationToken);
                }
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception exception)
            {
                logger.LogError(exception, "Prime number generation or publishing failed. The worker will retry.");
                try
                {
                    await Task.Delay(TimeSpan.FromSeconds(5), cancellationToken);
                }
                catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
                {
                    break;
                }
            }
        }
    }
}
