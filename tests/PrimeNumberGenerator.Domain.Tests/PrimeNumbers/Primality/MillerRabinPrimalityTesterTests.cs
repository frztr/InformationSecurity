using System.Numerics;
using FluentAssertions;
using PrimeNumberGenerator.Domain.PrimeNumbers.Primality;
using PrimeNumberGenerator.Domain.PrimeNumbers.Randomness;

namespace PrimeNumberGenerator.Domain.Tests.PrimeNumbers.Primality;

public sealed class MillerRabinPrimalityTesterTests
{
    private readonly MillerRabinPrimalityTester _millerRabinPrimalityTester = new(new CryptographicRandomIntegerSource());

    [Theory]
    [InlineData(2)]
    [InlineData(3)]
    [InlineData(5)]
    [InlineData(17)]
    [InlineData(97)]
    [InlineData(65537)]
    public void IsProbablePrime_ShouldReturnTrue_ForKnownPrimeNumbers(int primeNumber)
    {
        var isProbablePrime = _millerRabinPrimalityTester.IsProbablePrime(
            primeNumber,
            millerRabinWitnessRoundCount: 8,
            CancellationToken.None);

        isProbablePrime.Should().BeTrue();
    }

    [Theory]
    [InlineData(-7)]
    [InlineData(0)]
    [InlineData(1)]
    [InlineData(4)]
    [InlineData(9)]
    [InlineData(15)]
    [InlineData(21)]
    [InlineData(25)]
    [InlineData(27)]
    [InlineData(35)]
    [InlineData(121)]
    [InlineData(561)]
    [InlineData(1105)]
    [InlineData(1729)]
    public void IsProbablePrime_ShouldReturnFalse_ForKnownCompositeNumbers(int compositeNumber)
    {
        var isProbablePrime = _millerRabinPrimalityTester.IsProbablePrime(
            compositeNumber,
            millerRabinWitnessRoundCount: 16,
            CancellationToken.None);

        isProbablePrime.Should().BeFalse();
    }

    [Fact]
    public void IsProbablePrime_ShouldThrow_WhenWitnessRoundCountIsLessThanOne()
    {
        var act = () => _millerRabinPrimalityTester.IsProbablePrime(
            17,
            millerRabinWitnessRoundCount: 0,
            CancellationToken.None);

        act.Should().Throw<ArgumentOutOfRangeException>().WithParameterName("millerRabinWitnessRoundCount");
    }

    [Fact]
    public void IsProbablePrime_ShouldThrow_WhenCancellationIsRequested()
    {
        using var cancellationTokenSource = new CancellationTokenSource();
        cancellationTokenSource.Cancel();

        var act = () => _millerRabinPrimalityTester.IsProbablePrime(
            new BigInteger(97),
            millerRabinWitnessRoundCount: 8,
            cancellationTokenSource.Token);

        act.Should().Throw<OperationCanceledException>();
    }
}
