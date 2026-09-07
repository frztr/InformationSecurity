using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using PrimeNumberGenerator.Application.Configuration;
using PrimeNumberGenerator.Application.Publishing;
using PrimeNumberGenerator.Domain.PrimeNumbers;
using PrimeNumberGenerator.Domain.PrimeNumbers.Generation;

namespace PrimeNumberGenerator.Application.Generation;

/// <summary>
/// Запускает независимые потоки поиска: каждый находит простые числа и сразу публикует их.
/// </summary>
public sealed class PrimeNumberGenerationProcessor
{
    private readonly IPrimeNumberGenerator _primeNumberGenerator;
    private readonly IPrimeNumberPublisher _primeNumberPublisher;
    private readonly PrimeNumberGenerationOptions _generationOptions;
    private readonly ILogger<PrimeNumberGenerationProcessor> _logger;

    /// <summary>
    /// Создаёт процессор, который связывает генерацию и публикацию.
    /// </summary>
    public PrimeNumberGenerationProcessor(
        IPrimeNumberGenerator primeNumberGenerator,
        IPrimeNumberPublisher primeNumberPublisher,
        IOptions<PrimeNumberGenerationOptions> generationOptions,
        ILogger<PrimeNumberGenerationProcessor> logger)
    {
        _primeNumberGenerator = primeNumberGenerator;
        _primeNumberPublisher = primeNumberPublisher;
        _generationOptions = generationOptions.Value;
        _logger = logger;
    }

    /// <summary>
    /// Держит несколько независимых поисков, пока не сработает <paramref name="cancellationToken"/>.
    /// Каждый поток публикует число сразу после нахождения и не отменяет соседей.
    /// </summary>
    public async Task GenerateAndPublishUntilCancelledAsync(CancellationToken cancellationToken)
    {
        var bitLength = new BitLength(_generationOptions.BitLength);
        var independentSearchWorkerCount = ResolveParallelSearchWorkerCount();
        var processorLoadPolicy = new ProcessorLoadPolicy(
            _generationOptions.MaxProcessorUtilizationPercent,
            _generationOptions.WorkerThreadPriority);
        var generationParameters = new PrimeGenerationParameters(
            _generationOptions.MillerRabinWitnessRoundCount,
            _generationOptions.TrialDivisionPrimeCount,
            processorLoadPolicy);

        _logger.LogInformation(
            "Starting {IndependentSearchWorkerCount} independent {BitLength}-bit prime number searches at {MaxProcessorUtilizationPercent}% utilization with {WorkerThreadPriority} priority. Reserved idle cores: {ReservedIdleProcessorCount}.",
            independentSearchWorkerCount,
            bitLength.Value,
            processorLoadPolicy.MaxProcessorUtilizationPercent,
            processorLoadPolicy.WorkerThreadPriority,
            _generationOptions.ReservedIdleProcessorCount);

        var searchTasks = new Task[independentSearchWorkerCount];
        for (var workerIndex = 0; workerIndex < independentSearchWorkerCount; workerIndex++)
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
        BitLength bitLength,
        PrimeGenerationParameters generationParameters,
        CancellationToken cancellationToken)
    {
        while (!cancellationToken.IsCancellationRequested)
        {
            try
            {
                var primeNumber = await _primeNumberGenerator.GenerateAsync(
                    bitLength,
                    generationParameters,
                    cancellationToken);

                await _primeNumberPublisher.PublishAsync(primeNumber, cancellationToken);

                _logger.LogInformation(
                    "Published a {BitLength}-bit probable prime number.",
                    primeNumber.BitLength.Value);

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
                _logger.LogError(exception, "Prime number generation or publishing failed. The worker will retry.");
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

    /// <summary>
    /// Вычисляет число независимых потоков поиска по настройкам и <see cref="Environment.ProcessorCount"/>.
    /// </summary>
    private int ResolveParallelSearchWorkerCount()
    {
        return ParallelSearchWorkerCountResolver.Resolve(
            _generationOptions.ParallelSearchWorkerCount,
            Environment.ProcessorCount,
            _generationOptions.ReservedIdleProcessorCount);
    }
}
