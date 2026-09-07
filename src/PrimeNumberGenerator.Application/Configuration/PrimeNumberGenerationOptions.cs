using PrimeNumberGenerator.Domain.PrimeNumbers.Generation;
using PrimeNumberGenerator.Domain.PrimeNumbers.Primality;

namespace PrimeNumberGenerator.Application.Configuration;

/// <summary>
/// Секция YAML с параметрами генерации простых чисел, параллелизма и нагрузки на CPU.
/// </summary>
public sealed class PrimeNumberGenerationOptions
{
    /// <summary>
    /// Имя секции конфигурации.
    /// </summary>
    public const string SectionName = "PrimeNumberGeneration";

    /// <summary>
    /// Битовая длина генерируемых чисел. По заданию — 16384.
    /// </summary>
    public int BitLength { get; set; } = Domain.PrimeNumbers.BitLength.AssignmentRequiredValue;

    /// <summary>
    /// Число раундов Миллера–Рабина. Для 16384 бит достаточно трёх случайных свидетелей.
    /// </summary>
    public int MillerRabinWitnessRoundCount { get; set; } = 3;

    /// <summary>
    /// Сколько малых простых использовать в пробном делении.
    /// </summary>
    public int TrialDivisionPrimeCount { get; set; } = SmallPrimeNumberTable.MaximumSupportedPrimeCount;

    /// <summary>
    /// Пауза после успешной публикации в этом же потоке, перед следующим поиском.
    /// Ноль — сразу искать следующее число.
    /// </summary>
    public TimeSpan PauseBetweenGenerations { get; set; }

    /// <summary>
    /// Число независимых потоков поиска. Каждый находит и публикует числа сам.
    /// 0 — выбрать автоматически, оставив свободными <see cref="ReservedIdleProcessorCount"/> ядер.
    /// </summary>
    public int ParallelSearchWorkerCount { get; set; }

    /// <summary>
    /// Сколько ядер оставить свободными, если <see cref="ParallelSearchWorkerCount"/> равен 0.
    /// </summary>
    public int ReservedIdleProcessorCount { get; set; } = 1;

    /// <summary>
    /// Целевая загрузка CPU каждого потока поиска, 1–100. Остальное время поток простаивает.
    /// </summary>
    public int MaxProcessorUtilizationPercent { get; set; } = 100;

    /// <summary>
    /// Приоритет потоков поиска в операционной системе.
    /// </summary>
    public SearchWorkerPriority WorkerThreadPriority { get; set; } = SearchWorkerPriority.BelowNormal;
}
