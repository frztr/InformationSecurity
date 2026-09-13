using System.Numerics;

namespace PrimeNumberGenerator.Domain.PrimeNumbers;

/// <summary>
/// Объект-значение вероятностно простого числа вместе с битовой длиной и временем генерации.
/// </summary>
public sealed class PrimeNumber : IEquatable<PrimeNumber>
{
    /// <summary>
    /// Десятичное значение вероятностно простого числа.
    /// </summary>
    public BigInteger Value { get; }

    /// <summary>
    /// Битовая длина числа.
    /// </summary>
    public int BitLength { get; }

    /// <summary>
    /// Момент по UTC, когда число приняли как вероятностно простое.
    /// </summary>
    public DateTimeOffset GeneratedAt { get; }

    /// <summary>
    /// Создаёт простое число после проверки, что значение не меньше 2 и совпадает с ожидаемой битовой длиной.
    /// </summary>
    /// <param name="value">Кандидат в простые числа.</param>
    /// <param name="bitLength">Битовая длина, которой должно обладать значение.</param>
    /// <param name="generatedAt">Момент получения значения.</param>
    public PrimeNumber(BigInteger value, int bitLength, DateTimeOffset generatedAt)
    {
        if (bitLength < 2)
        {
            throw new ArgumentOutOfRangeException(
                nameof(bitLength),
                bitLength,
                "Bit length must be at least 2.");
        }

        if (value < 2)
        {
            throw new ArgumentOutOfRangeException(nameof(value), value, "A prime number must be greater than or equal to 2.");
        }

        long actualBitLength = value.GetBitLength();
        if (actualBitLength != bitLength)
        {
            throw new ArgumentException(
                $"The prime number bit length is {actualBitLength}, but {bitLength} was expected.",
                nameof(value));
        }

        Value = value;
        BitLength = bitLength;
        GeneratedAt = generatedAt;
    }

    /// <summary>
    /// Сравнивает это простое число с другим экземпляром.
    /// </summary>
    public bool Equals(PrimeNumber? other)
    {
        return other is not null
            && Value.Equals(other.Value)
            && BitLength == other.BitLength
            && GeneratedAt.Equals(other.GeneratedAt);
    }

    /// <inheritdoc />
    public override bool Equals(object? obj)
    {
        return Equals(obj as PrimeNumber);
    }

    /// <inheritdoc />
    public override int GetHashCode()
    {
        return HashCode.Combine(Value, BitLength, GeneratedAt);
    }

    /// <inheritdoc />
    public override string ToString()
    {
        return Value.ToString();
    }
}
