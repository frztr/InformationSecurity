using Microsoft.Extensions.Options;
using PrimeNumberGenerator.Application.Configuration;
using PrimeNumberGenerator.Application.Generation;

namespace PrimeNumberGenerator.Api.Workers;

/// <summary>
/// Фоновый воркер, который непрерывно генерирует вероятностно простые числа и публикует их в Kafka.
/// </summary>
public sealed class PrimeNumberGenerationWorker(
    PrimeNumberGenerationProcessor primeNumberGenerationProcessor,
    IOptions<PrimeNumberGenerationOptions> generationOptions,
    IOptions<KafkaOptions> kafkaOptions,
    ILogger<PrimeNumberGenerationWorker> logger)
    : BackgroundService
{
    private readonly PrimeNumberGenerationOptions _generationOptions = generationOptions.Value;
    private readonly KafkaOptions _kafkaOptions = kafkaOptions.Value;

    /// <summary>
    /// Запускает независимые поиски и ждёт остановки хоста.
    /// </summary>
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        int independentSearchWorkersCount = ParallelSearchWorkerCountResolver.Resolve(
            _generationOptions.ParallelSearchWorkerCount,
            Environment.ProcessorCount,
            _generationOptions.ReservedIdleProcessorCount);

        logger.LogInformation(
            @"Prime number generation worker started.
              Bit length: {BitLength}.
              Kafka topic: {Topic}.
              Independent search workers: {ParallelSearchWorkerCount}.
              Processor utilization: {MaxProcessorUtilizationPercent}%.
              Thread priority: {WorkerThreadPriority}.
              Reserved idle cores: {ReservedIdleProcessorCount}.",
            _generationOptions.BitLength,
            _kafkaOptions.Topic,
            independentSearchWorkersCount,
            _generationOptions.MaxProcessorUtilizationPercent,
            _generationOptions.WorkerThreadPriority,
            _generationOptions.ReservedIdleProcessorCount);

        try
        {
            await primeNumberGenerationProcessor.GenerateAndPublishUntilCancelledAsync(stoppingToken);
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
        }

        logger.LogInformation("Prime number generation worker stopped.");
    }
}
