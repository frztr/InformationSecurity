namespace PrimeNumberGenerator.Domain.PrimeNumbers.Generation;

/// <summary>
/// Сопоставляет приоритет потока поиска с <see cref="ThreadPriority"/>.
/// </summary>
public static class SearchWorkerPriorityExtensions
{
    /// <summary>
    /// Возвращает приоритет CLR для <paramref name="searchWorkerPriority"/>.
    /// </summary>
    public static ThreadPriority ToThreadPriority(this SearchWorkerPriority searchWorkerPriority)
    {
        return searchWorkerPriority switch
        {
            SearchWorkerPriority.Lowest => ThreadPriority.Lowest,
            SearchWorkerPriority.BelowNormal => ThreadPriority.BelowNormal,
            SearchWorkerPriority.Normal => ThreadPriority.Normal,
            _ => throw new ArgumentOutOfRangeException(
                nameof(searchWorkerPriority),
                searchWorkerPriority,
                "Приоритет потока поиска должен быть Lowest, BelowNormal или Normal.")
        };
    }
}
