using System.Numerics;

namespace PrimeNumberGenerator.Domain.PrimeNumbers.Randomness;

/// <summary>
/// Поставляет криптографически стойкие случайные байты и целые числа.
/// </summary>
public interface IRandomIntegerSource
{
    /// <summary>
    /// Заполняет <paramref name="buffer"/> случайными байтами.
    /// </summary>
    void FillBytes(byte[] buffer);

    /// <summary>
    /// Возвращает равномерно выбранное целое число в замкнутом диапазоне
    /// [<paramref name="inclusiveMinimum"/>, <paramref name="inclusiveMaximum"/>].
    /// </summary>
    BigInteger NextInclusive(BigInteger inclusiveMinimum, BigInteger inclusiveMaximum);
}
