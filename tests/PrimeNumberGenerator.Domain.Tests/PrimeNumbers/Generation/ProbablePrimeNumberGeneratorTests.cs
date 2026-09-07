using System.Numerics;
using FluentAssertions;
using PrimeNumberGenerator.Domain.PrimeNumbers;
using PrimeNumberGenerator.Domain.PrimeNumbers.Generation;
using PrimeNumberGenerator.Domain.PrimeNumbers.Primality;
using PrimeNumberGenerator.Domain.PrimeNumbers.Randomness;

namespace PrimeNumberGenerator.Domain.Tests.PrimeNumbers.Generation;

public sealed class ProbablePrimeNumberGeneratorTests
{
    private readonly ProbablePrimeNumberGenerator _probablePrimeNumberGenerator = new(
        new CryptographicOddPrimeCandidateSource(new CryptographicRandomIntegerSource()),
        new TrialDivisionFilter(),
        new MillerRabinPrimalityTester(new CryptographicRandomIntegerSource()),
        new ProcessorLoadGovernor(),
        TimeProvider.System);

    [Theory]
    [InlineData(8)]
    [InlineData(16)]
    public async Task GenerateAsync_ShouldReturnPrimeNumberWithRequestedBitLength(int bitLengthValue)
    {
        var bitLength = new BitLength(bitLengthValue);
        var generationParameters = new PrimeGenerationParameters(
            millerRabinWitnessRoundCount: 8,
            trialDivisionPrimeCount: 32);

        var primeNumber = await _probablePrimeNumberGenerator.GenerateAsync(
            bitLength,
            generationParameters,
            CancellationToken.None);

        primeNumber.BitLength.Value.Should().Be(bitLengthValue);
        primeNumber.Value.GetBitLength().Should().Be(bitLengthValue);
        NaiveIntegerMath.IsPrimeByTrialDivision(primeNumber.Value).Should().BeTrue();
    }

    [Fact]
    public async Task GenerateAsync_ShouldThrow_WhenCancellationIsRequestedBeforeGenerationStarts()
    {
        using var cancellationTokenSource = new CancellationTokenSource();
        cancellationTokenSource.Cancel();

        var act = async () => await _probablePrimeNumberGenerator.GenerateAsync(
            new BitLength(16),
            new PrimeGenerationParameters(8, 16),
            cancellationTokenSource.Token);

        await act.Should().ThrowAsync<OperationCanceledException>();
    }

    [Fact]
    public async Task GenerateAsync_ShouldReturnPrimeNumber_WhenProcessorLoadIsThrottled()
    {
        var generationParameters = new PrimeGenerationParameters(
            millerRabinWitnessRoundCount: 8,
            trialDivisionPrimeCount: 32,
            processorLoadPolicy: new ProcessorLoadPolicy(50, SearchWorkerPriority.BelowNormal));

        var primeNumber = await _probablePrimeNumberGenerator.GenerateAsync(
            new BitLength(16),
            generationParameters,
            CancellationToken.None);

        NaiveIntegerMath.IsPrimeByTrialDivision(primeNumber.Value).Should().BeTrue();
    }
}

internal static class NaiveIntegerMath
{
    public static bool IsPrimeByTrialDivision(BigInteger value)
    {
        if (value < 2)
        {
            return false;
        }

        if (value == 2 || value == 3)
        {
            return true;
        }

        if (value % 2 == 0)
        {
            return false;
        }

        for (var divisor = new BigInteger(3); divisor * divisor <= value; divisor += 2)
        {
            if (value % divisor == BigInteger.Zero)
            {
                return false;
            }
        }

        return true;
    }
}
