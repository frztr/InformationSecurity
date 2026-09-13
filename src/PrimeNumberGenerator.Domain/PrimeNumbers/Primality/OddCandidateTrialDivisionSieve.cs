using System.Numerics;

namespace PrimeNumberGenerator.Domain.PrimeNumbers.Primality;

/// <summary>
/// Просеивает нечётных кандидатов пробным делением.
/// Остатки по малым простым считаются один раз и обновляются при шаге +2 без деления длинного числа.
/// </summary>
public sealed class OddCandidateTrialDivisionSieve
{
    private readonly int[] _smallPrimeNumbers;
    private readonly int[] _remainders;
    private BigInteger _currentCandidate;
    private bool _hasCandidate;

    /// <summary>
    /// Создаёт решето по первым <paramref name="trialDivisionPrimeCount"/> малым простым, начиная с 3.
    /// Двойка не нужна: кандидат всегда нечётный.
    /// </summary>
    public OddCandidateTrialDivisionSieve(int trialDivisionPrimeCount)
    {
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

        int skipTwo = trialDivisionPrimeCount > 1 ? 1 : 0;
        int remainderCount = trialDivisionPrimeCount - skipTwo;
        _smallPrimeNumbers = new int[remainderCount];
        _remainders = new int[remainderCount];

        for (int primeIndex = 0; primeIndex < remainderCount; primeIndex++)
        {
            _smallPrimeNumbers[primeIndex] = SmallPrimeNumberTable.FirstPrimeNumbers[primeIndex + skipTwo];
        }
    }

    /// <summary>
    /// Текущий нечётный кандидат.
    /// </summary>
    public BigInteger CurrentCandidate
    {
        get
        {
            EnsureHasCandidate();
            return _currentCandidate;
        }
    }

    /// <summary>
    /// Задаёт новый нечётный кандидат и пересчитывает остатки.
    /// </summary>
    public void Reset(BigInteger oddCandidate)
    {
        if (oddCandidate < 2)
        {
            throw new ArgumentOutOfRangeException(
                nameof(oddCandidate),
                oddCandidate,
                "Кандидат должен быть не меньше 2.");
        }

        if ((oddCandidate & BigInteger.One) == BigInteger.Zero)
        {
            throw new ArgumentException("Кандидат для решета должен быть нечётным.", nameof(oddCandidate));
        }

        _currentCandidate = oddCandidate;
        _hasCandidate = true;
        RecalculateRemaindersFromCandidateBytes();
    }

    /// <summary>
    /// Возвращает true, если текущий кандидат не делится ни на одно из малых простых
    /// либо сам равен одному из них.
    /// </summary>
    public bool CurrentCandidateSurvives()
    {
        EnsureHasCandidate();

        for (int primeIndex = 0; primeIndex < _remainders.Length; primeIndex++)
        {
            if (_remainders[primeIndex] != 0)
            {
                continue;
            }

            if (_currentCandidate == _smallPrimeNumbers[primeIndex])
            {
                return true;
            }

            return false;
        }

        return true;
    }

    /// <summary>
    /// Переходит к следующему нечётному числу и обновляет остатки сложением.
    /// </summary>
    public void AdvanceToNextOddCandidate()
    {
        EnsureHasCandidate();

        _currentCandidate += 2;

        for (int primeIndex = 0; primeIndex < _remainders.Length; primeIndex++)
        {
            int remainder = _remainders[primeIndex] + 2;
            int smallPrimeNumber = _smallPrimeNumbers[primeIndex];
            if (remainder >= smallPrimeNumber)
            {
                remainder -= smallPrimeNumber;
            }

            _remainders[primeIndex] = remainder;
        }
    }

    /// <summary>
    /// Считает остатки по байтам кандидата, без деления самого <see cref="BigInteger"/> на каждое простое.
    /// </summary>
    private void RecalculateRemaindersFromCandidateBytes()
    {
        byte[] candidateBytes = _currentCandidate.ToByteArray(isUnsigned: true, isBigEndian: false);

        for (int primeIndex = 0; primeIndex < _smallPrimeNumbers.Length; primeIndex++)
        {
            _remainders[primeIndex] = RemainderFromLittleEndianBytes(candidateBytes, _smallPrimeNumbers[primeIndex]);
        }
    }

    /// <summary>
    /// Возвращает значение little-endian байтов по модулю <paramref name="modulus"/>.
    /// </summary>
    private static int RemainderFromLittleEndianBytes(byte[] candidateBytes, int modulus)
    {
        int remainder = 0;
        int basePower = 1;

        for (int byteIndex = 0; byteIndex < candidateBytes.Length; byteIndex++)
        {
            remainder = (int)((remainder + (long)candidateBytes[byteIndex] * basePower) % modulus);
            basePower = (int)((basePower * 256L) % modulus);
        }

        return remainder;
    }

    /// <summary>
    /// Проверяет, что решето уже получило кандидата через <see cref="Reset"/>.
    /// </summary>
    private void EnsureHasCandidate()
    {
        if (!_hasCandidate)
        {
            throw new InvalidOperationException("Сначала задайте кандидата методом Reset.");
        }
    }
}
