namespace PrimeNumberGenerator.Domain.PrimeNumbers.Generation;

/// <summary>
/// Реализация ограничителя нагрузки: меняет <see cref="Thread.Priority"/> и ждёт на токене отмены.
/// </summary>
public sealed class ProcessorLoadGovernor : IProcessorLoadGovernor
{
    /// <summary>
    /// Устанавливает приоритет текущего потока и восстанавливает его при освобождении области.
    /// </summary>
    public IDisposable ApplyWorkerThreadPriority(SearchWorkerPriority searchWorkerPriority)
    {
        var currentThread = Thread.CurrentThread;
        var originalPriority = currentThread.Priority;
        currentThread.Priority = MapToThreadingPriority(searchWorkerPriority);
        return new ThreadPriorityScope(currentThread, originalPriority);
    }

    /// <summary>
    /// Спит на паузу, рассчитанную по <paramref name="spentWorking"/>, если отмена не запрошена.
    /// </summary>
    public void YieldToOtherProcesses(
        ProcessorLoadPolicy processorLoadPolicy,
        TimeSpan spentWorking,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var idlePause = processorLoadPolicy.CalculateIdlePause(spentWorking);
        if (idlePause <= TimeSpan.Zero)
        {
            return;
        }

        if (cancellationToken.WaitHandle.WaitOne(idlePause))
        {
            cancellationToken.ThrowIfCancellationRequested();
        }
    }

    /// <summary>
    /// Переводит приоритет предметной области в <see cref="ThreadPriority"/>.
    /// </summary>
    private static ThreadPriority MapToThreadingPriority(SearchWorkerPriority searchWorkerPriority)
    {
        return searchWorkerPriority switch
        {
            SearchWorkerPriority.Lowest => ThreadPriority.Lowest,
            SearchWorkerPriority.BelowNormal => ThreadPriority.BelowNormal,
            SearchWorkerPriority.Normal => ThreadPriority.Normal,
            _ => ThreadPriority.BelowNormal
        };
    }

    /// <summary>
    /// Восстанавливает исходный приоритет потока при освобождении.
    /// </summary>
    private sealed class ThreadPriorityScope : IDisposable
    {
        private readonly Thread _workerThread;
        private readonly ThreadPriority _originalPriority;

        /// <summary>
        /// Запоминает <paramref name="originalPriority"/> для <paramref name="workerThread"/>.
        /// </summary>
        public ThreadPriorityScope(Thread workerThread, ThreadPriority originalPriority)
        {
            _workerThread = workerThread;
            _originalPriority = originalPriority;
        }

        /// <summary>
        /// Восстанавливает приоритет потока, зафиксированный при создании.
        /// </summary>
        public void Dispose()
        {
            _workerThread.Priority = _originalPriority;
        }
    }
}
