using PrimeNumberGenerator.Domain.PrimeNumbers.Generation;
using PrimeNumberGenerator.Domain.PrimeNumbers.Primality;

namespace PrimeNumberGenerator.Domain.PrimeNumbers;

/// <summary>
/// Параметры поиска вероятностно простого числа.
/// </summary>
public sealed class PrimeGenerationParameters
{
    /// <summary>
    /// Число раундов Миллера–Рабина для кандидата, прошедшего пробное деление.
    /// </summary>
    public int MillerRabinWitnessRoundCount { get; }

    /// <summary>
    /// Сколько малых простых использовать в пробном делении до Миллера–Рабина.
    /// </summary>
    public int TrialDivisionPrimeCount { get; }

    /// <summary>
    /// Политика нагрузки на CPU для потока поиска.
    /// </summary>
    public ProcessorLoadPolicy ProcessorLoadPolicy { get; }

    /// <summary>
    /// Создаёт параметры генерации и проверяет, что все счётчики в допустимом диапазоне.
    /// </summary>
    /// <param name="millerRabinWitnessRoundCount">Раунды Миллера–Рабина, не меньше 1.</param>
    /// <param name="trialDivisionPrimeCount">Малые простые для пробного деления.</param>
    /// <param name="processorLoadPolicy">Политика нагрузки. При отсутствии используется полная загрузка.</param>
    public PrimeGenerationParameters(
        int millerRabinWitnessRoundCount,
        int trialDivisionPrimeCount,
        ProcessorLoadPolicy? processorLoadPolicy = null)
    {
        if (millerRabinWitnessRoundCount < 1)
        {
            throw new ArgumentOutOfRangeException(
                nameof(millerRabinWitnessRoundCount),
                millerRabinWitnessRoundCount,
                "Тест Миллера–Рабина должен использовать хотя бы один раунд со свидетелем.");
        }

        if (trialDivisionPrimeCount < 1)
        {
            throw new ArgumentOutOfRangeException(
                nameof(trialDivisionPrimeCount),
                trialDivisionPrimeCount,
                "Пробное деление должно использовать хотя бы одно малое простое число.");
        }

        if (trialDivisionPrimeCount > SmallPrimeNumberTable.MaximumSupportedPrimeCount)
        {
            throw new ArgumentOutOfRangeException(
                nameof(trialDivisionPrimeCount),
                trialDivisionPrimeCount,
                $"Пробное деление поддерживает не больше {SmallPrimeNumberTable.MaximumSupportedPrimeCount} малых простых чисел.");
        }

        MillerRabinWitnessRoundCount = millerRabinWitnessRoundCount;
        TrialDivisionPrimeCount = trialDivisionPrimeCount;
        ProcessorLoadPolicy = processorLoadPolicy ?? ProcessorLoadPolicy.Unthrottled;
    }
}
