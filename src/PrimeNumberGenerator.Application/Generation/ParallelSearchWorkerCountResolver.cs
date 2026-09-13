namespace PrimeNumberGenerator.Application.Generation;

/// <summary>
/// Считает, сколько независимых потоков поиска запустить, по конфигурации и видимому числу CPU.
/// </summary>
public static class ParallelSearchWorkerCountResolver
{
    /// <summary>
    /// Возвращает <paramref name="configuredWorkerCount"/>, если оно больше нуля;
    /// иначе оставляет хотя бы один поток после вычета зарезервированных ядер.
    /// </summary>
    /// <param name="configuredWorkerCount">0 означает автоматический выбор.</param>
    /// <param name="availableProcessorCount">Логические процессоры, которые видит среда выполнения.</param>
    /// <param name="reservedIdleProcessorCount">Ядра, которые нужно оставить свободными.</param>
    public static int Resolve(
        int configuredWorkerCount,
        int availableProcessorCount,
        int reservedIdleProcessorCount)
    {
        if (configuredWorkerCount < 0)
        {
            throw new ArgumentOutOfRangeException(
                nameof(configuredWorkerCount),
                configuredWorkerCount,
                "Заданное число потоков поиска должно быть не меньше 0. Значение 0 включает автоматический выбор.");
        }

        if (availableProcessorCount < 1)
        {
            throw new ArgumentOutOfRangeException(
                nameof(availableProcessorCount),
                availableProcessorCount,
                "Число доступных процессоров должно быть не меньше 1.");
        }

        if (reservedIdleProcessorCount < 0)
        {
            throw new ArgumentOutOfRangeException(
                nameof(reservedIdleProcessorCount),
                reservedIdleProcessorCount,
                "Число резервируемых свободных процессоров должно быть не меньше 0.");
        }

        if (configuredWorkerCount > 0)
        {
            return configuredWorkerCount;
        }

        int processorCountKeptIdle = Math.Min(reservedIdleProcessorCount, availableProcessorCount - 1);
        return Math.Max(1, availableProcessorCount - processorCountKeptIdle);
    }
}
