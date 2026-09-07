namespace PrimeNumberGenerator.Domain.PrimeNumbers.Generation;

/// <summary>
/// Ограничивает, насколько агрессивно потоки поиска используют процессор.
/// </summary>
public sealed class ProcessorLoadPolicy
{
    /// <summary>
    /// Процент загрузки, при котором паузы простоя отключены.
    /// </summary>
    public const int FullUtilizationPercent = 100;

    /// <summary>
    /// Целевая загрузка CPU каждого потока поиска, от 1 до 100.
    /// </summary>
    public int MaxProcessorUtilizationPercent { get; }

    /// <summary>
    /// Приоритет операционной системы, назначаемый потоку поиска.
    /// </summary>
    public SearchWorkerPriority WorkerThreadPriority { get; }

    /// <summary>
    /// Создаёт политику нагрузки с процентом загрузки в диапазоне [1, 100].
    /// </summary>
    public ProcessorLoadPolicy(int maxProcessorUtilizationPercent, SearchWorkerPriority workerThreadPriority)
    {
        if (maxProcessorUtilizationPercent is < 1 or > FullUtilizationPercent)
        {
            throw new ArgumentOutOfRangeException(
                nameof(maxProcessorUtilizationPercent),
                maxProcessorUtilizationPercent,
                "Процент загрузки процессора должен быть от 1 до 100.");
        }

        if (!Enum.IsDefined(workerThreadPriority))
        {
            throw new ArgumentOutOfRangeException(
                nameof(workerThreadPriority),
                workerThreadPriority,
                "Приоритет потока поиска должен быть Lowest, BelowNormal или Normal.");
        }

        MaxProcessorUtilizationPercent = maxProcessorUtilizationPercent;
        WorkerThreadPriority = workerThreadPriority;
    }

    /// <summary>
    /// Политика без пауз и с обычным приоритетом потока.
    /// </summary>
    public static ProcessorLoadPolicy Unthrottled { get; } = new(
        FullUtilizationPercent,
        SearchWorkerPriority.Normal);

    /// <summary>
    /// Считает, сколько поток должен простаивать после <paramref name="spentWorking"/>, чтобы держаться целевой загрузки.
    /// </summary>
    public TimeSpan CalculateIdlePause(TimeSpan spentWorking)
    {
        if (spentWorking <= TimeSpan.Zero || MaxProcessorUtilizationPercent == FullUtilizationPercent)
        {
            return TimeSpan.Zero;
        }

        var idleMilliseconds = spentWorking.TotalMilliseconds
            * (FullUtilizationPercent - MaxProcessorUtilizationPercent)
            / MaxProcessorUtilizationPercent;

        return TimeSpan.FromMilliseconds(idleMilliseconds);
    }
}
