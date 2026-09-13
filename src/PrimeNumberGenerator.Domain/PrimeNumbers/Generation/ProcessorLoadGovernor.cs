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
        Thread currentThread = Thread.CurrentThread;
        ThreadPriority originalPriority = currentThread.Priority;
        currentThread.Priority = searchWorkerPriority.ToThreadPriority();
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

        TimeSpan idlePause = processorLoadPolicy.CalculateIdlePause(spentWorking);
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
    /// Восстанавливает исходный приоритет потока при освобождении.
    /// </summary>
    private sealed class ThreadPriorityScope(Thread workerThread, ThreadPriority originalPriority) : IDisposable
    {
        /// <summary>
        /// Восстанавливает приоритет потока, зафиксированный при создании.
        /// </summary>
        public void Dispose()
        {
            workerThread.Priority = originalPriority;
        }
    }
}
