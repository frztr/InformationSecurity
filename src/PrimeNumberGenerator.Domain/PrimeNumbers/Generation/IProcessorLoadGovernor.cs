namespace PrimeNumberGenerator.Domain.PrimeNumbers.Generation;

/// <summary>
/// Задаёт приоритет потока и паузы простоя, чтобы поиск простых чисел не вытеснял другие процессы.
/// </summary>
public interface IProcessorLoadGovernor
{
    /// <summary>
    /// Устанавливает приоритет текущего потока и возвращает область, которая восстановит прежнее значение.
    /// </summary>
    IDisposable ApplyWorkerThreadPriority(SearchWorkerPriority searchWorkerPriority);

    /// <summary>
    /// Блокирует текущий поток согласно <paramref name="processorLoadPolicy"/> после кванта работы.
    /// </summary>
    void YieldToOtherProcesses(
        ProcessorLoadPolicy processorLoadPolicy,
        TimeSpan spentWorking,
        CancellationToken cancellationToken);
}
