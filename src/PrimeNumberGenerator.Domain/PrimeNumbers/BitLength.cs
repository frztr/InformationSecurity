namespace PrimeNumberGenerator.Domain.PrimeNumbers;

/// <summary>
/// Объект-значение битовой длины генерируемого простого числа.
/// </summary>
public sealed class BitLength : IEquatable<BitLength>
{
    /// <summary>
    /// Битовая длина, требуемая заданием.
    /// </summary>
    public const int AssignmentRequiredValue = 16384;

    /// <summary>
    /// Число бит простого числа.
    /// </summary>
    public int Value { get; }

    /// <summary>
    /// Создаёт битовую длину не меньше 2.
    /// </summary>
    /// <param name="value">Запрошенная битовая длина.</param>
    public BitLength(int value)
    {
        if (value < 2)
        {
            throw new ArgumentOutOfRangeException(
                nameof(value),
                value,
                "Bit length must be at least 2, because 2 is the smallest prime number.");
        }

        Value = value;
    }

    /// <summary>
    /// Сравнивает эту битовую длину с другим экземпляром.
    /// </summary>
    public bool Equals(BitLength? other)
    {
        return other is not null && Value == other.Value;
    }

    /// <inheritdoc />
    public override bool Equals(object? obj)
    {
        return Equals(obj as BitLength);
    }

    /// <inheritdoc />
    public override int GetHashCode()
    {
        return Value.GetHashCode();
    }

    /// <inheritdoc />
    public override string ToString()
    {
        return Value.ToString();
    }
}
