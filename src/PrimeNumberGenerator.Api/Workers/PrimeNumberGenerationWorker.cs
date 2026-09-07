using Microsoft.Extensions.Options;
using PrimeNumberGenerator.Application.Configuration;
using PrimeNumberGenerator.Application.Generation;
using PrimeNumberGenerator.Application.Publishing;

namespace PrimeNumberGenerator.Api.Workers;

/// <summary>
/// Фоновый воркер, который непрерывно генерирует вероятностно простые числа и публикует их.
/// </summary>
public sealed class PrimeNumberGenerationWorker : BackgroundService
{
    private readonly PrimeNumberGenerationProcessor _primeNumberGenerationProcessor;
    private readonly PrimeNumberGenerationOptions _generationOptions;
    private readonly PublishingOptions _publishingOptions;
    private readonly ILogger<PrimeNumberGenerationWorker> _logger;

    /// <summary>
    /// Создаёт размещённую службу, которая использует <paramref name="primeNumberGenerationProcessor"/>.
    /// </summary>
    public PrimeNumberGenerationWorker(
        PrimeNumberGenerationProcessor primeNumberGenerationProcessor,
        IOptions<PrimeNumberGenerationOptions> generationOptions,
        IOptions<PublishingOptions> publishingOptions,
        ILogger<PrimeNumberGenerationWorker> logger)
    {
        _primeNumberGenerationProcessor = primeNumberGenerationProcessor;
        _generationOptions = generationOptions.Value;
        _publishingOptions = publishingOptions.Value;
        _logger = logger;
    }

    /// <summary>
    /// Запускает независимые поиски и ждёт остановки хоста.
    /// </summary>
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation(
            "Prime number generation worker started. Bit length: {BitLength}. Destination: {Destination}. Independent search workers: {ParallelSearchWorkerCount}. Processor utilization: {MaxProcessorUtilizationPercent}%. Thread priority: {WorkerThreadPriority}. Reserved idle cores: {ReservedIdleProcessorCount}.",
            _generationOptions.BitLength,
            _publishingOptions.Destination,
            ParallelSearchWorkerCountResolver.Resolve(
                _generationOptions.ParallelSearchWorkerCount,
                Environment.ProcessorCount,
                _generationOptions.ReservedIdleProcessorCount),
            _generationOptions.MaxProcessorUtilizationPercent,
            _generationOptions.WorkerThreadPriority,
            _generationOptions.ReservedIdleProcessorCount);

        try
        {
            await _primeNumberGenerationProcessor.GenerateAndPublishUntilCancelledAsync(stoppingToken);
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
        }

        _logger.LogInformation("Prime number generation worker stopped.");
    }
}
