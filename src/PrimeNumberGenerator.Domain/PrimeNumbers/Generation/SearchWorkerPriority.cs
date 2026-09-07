namespace PrimeNumberGenerator.Domain.PrimeNumbers.Generation;

/// <summary>
/// Приоритет потока, который ищет простое число.
/// </summary>
public enum SearchWorkerPriority
{
    /// <summary>
    /// Наименьший приоритет планирования.
    /// </summary>
    Lowest = 0,

    /// <summary>
    /// Ниже обычного приоритета процесса, чтобы другие сервисы раньше получали CPU.
    /// </summary>
    BelowNormal = 1,

    /// <summary>
    /// Обычный приоритет планирования.
    /// </summary>
    Normal = 2
}
