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
    /// Битовая длина, запрошенная при генерации.
    /// </summary>
    public BitLength BitLength { get; }

    /// <summary>
    /// Момент по UTC, когда число приняли как вероятностно простое.
    /// </summary>
    public DateTimeOffset GeneratedAt { get; }

    private PrimeNumber(BigInteger value, BitLength bitLength, DateTimeOffset generatedAt)
    {
        Value = value;
        BitLength = bitLength;
        GeneratedAt = generatedAt;
    }

    /// <summary>
    /// Создаёт простое число после проверки, что значение не меньше 2 и совпадает с ожидаемой битовой длиной.
    /// </summary>
    /// <param name="value">Кандидат в простые числа.</param>
    /// <param name="expectedBitLength">Битовая длина, которой должно обладать значение.</param>
    /// <param name="generatedAt">Момент получения значения.</param>
    public static PrimeNumber Create(BigInteger value, BitLength expectedBitLength, DateTimeOffset generatedAt)
    {
        if (value < 2)
        {
            throw new ArgumentOutOfRangeException(nameof(value), value, "A prime number must be greater than or equal to 2.");
        }

        var actualBitLength = value.GetBitLength();
        if (actualBitLength != expectedBitLength.Value)
        {
            throw new ArgumentException(
                $"The prime number bit length is {actualBitLength}, but {expectedBitLength.Value} was expected.",
                nameof(value));
        }

        return new PrimeNumber(value, expectedBitLength, generatedAt);
    }

    /// <summary>
    /// Сравнивает это простое число с другим экземпляром.
    /// </summary>
    public bool Equals(PrimeNumber? other)
    {
        return other is not null
            && Value.Equals(other.Value)
            && BitLength.Equals(other.BitLength)
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
