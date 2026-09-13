namespace PrimeNumberGenerator.Domain.PrimeNumbers.Primality;

/// <summary>
/// Таблица первых малых простых чисел для пробного деления.
/// </summary>
public static class SmallPrimeNumberTable
{
    /// <summary>
    /// Максимальное число малых простых, которое может выдать таблица.
    /// </summary>
    public const int MaximumSupportedPrimeCount = 10_000;

    /// <summary>
    /// Первые <see cref="MaximumSupportedPrimeCount"/> простых чисел, начиная с 2.
    /// </summary>
    public static IReadOnlyList<int> FirstPrimeNumbers { get; } = GenerateFirstPrimeNumbers(MaximumSupportedPrimeCount);

    /// <summary>
    /// Строит запрошенное число простых решетом Эратосфена.
    /// </summary>
    private static IReadOnlyList<int> GenerateFirstPrimeNumbers(int primeCount)
    {
        int sieveLimit = EstimateSieveLimit(primeCount);
        bool[] isComposite = new bool[sieveLimit + 1];
        List<int> primeNumbers = new List<int>(primeCount);

        for (int candidate = 2; candidate <= sieveLimit && primeNumbers.Count < primeCount; candidate++)
        {
            if (isComposite[candidate])
            {
                continue;
            }

            primeNumbers.Add(candidate);

            for (int multiple = candidate * 2; multiple <= sieveLimit; multiple += candidate)
            {
                isComposite[multiple] = true;
            }
        }

        if (primeNumbers.Count < primeCount)
        {
            throw new InvalidOperationException(
                $"Предел решета {sieveLimit} слишком мал, чтобы получить {primeCount} простых чисел.");
        }

        return primeNumbers;
    }

    /// <summary>
    /// Оценивает верхнюю границу n-го простого, чтобы решето было достаточно большим.
    /// </summary>
    private static int EstimateSieveLimit(int primeCount)
    {
        if (primeCount < 6)
        {
            return 15;
        }

        double primeCountAsDouble = (double)primeCount;
        double upperBound = primeCountAsDouble * (Math.Log(primeCountAsDouble) + Math.Log(Math.Log(primeCountAsDouble)));
        return (int)Math.Ceiling(upperBound) + 32;
    }
}
