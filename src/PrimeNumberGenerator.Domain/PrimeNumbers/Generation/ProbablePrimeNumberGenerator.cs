using System.Diagnostics;
using System.Numerics;
using PrimeNumberGenerator.Domain.PrimeNumbers.Primality;

namespace PrimeNumberGenerator.Domain.PrimeNumbers.Generation;

/// <summary>
/// Ищет одно вероятностно простое число пробным делением и тестом Миллера–Рабина в текущем потоке.
/// </summary>
public sealed class ProbablePrimeNumberGenerator(
    IPrimeCandidateSource primeCandidateSource,
    TrialDivisionFilter trialDivisionFilter,
    IPrimalityTester primalityTester,
    IProcessorLoadGovernor processorLoadGovernor,
    TimeProvider timeProvider)
    : IPrimeNumberGenerator
{
    private static readonly TimeSpan MinimumPacingSlice = TimeSpan.FromMilliseconds(20);

    /// <summary>
    /// Запускает поиск в отдельном долгом потоке и возвращает найденное вероятностно простое число.
    /// </summary>
    public Task<PrimeNumber> GenerateAsync(
        BitLength bitLength,
        PrimeGenerationParameters generationParameters,
        CancellationToken cancellationToken)
    {
        return Task.Factory.StartNew(
            () => SearchOnCurrentThread(bitLength, generationParameters, cancellationToken),
            cancellationToken,
            TaskCreationOptions.LongRunning,
            TaskScheduler.Default);
    }

    /// <summary>
    /// Перебирает нечётных кандидатов в текущем потоке, пока не найдёт простое число или не придёт отмена.
    /// </summary>
    private PrimeNumber SearchOnCurrentThread(
        BitLength bitLength,
        PrimeGenerationParameters generationParameters,
        CancellationToken cancellationToken)
    {
        using var threadPriorityScope = processorLoadGovernor.ApplyWorkerThreadPriority(
            generationParameters.ProcessorLoadPolicy.WorkerThreadPriority);

        var trialDivisionSieve = trialDivisionFilter.CreateSieve(generationParameters.TrialDivisionPrimeCount);
        ResetSieveToCandidateOfRequestedBitLength(trialDivisionSieve, bitLength);
        var workSliceStopwatch = Stopwatch.StartNew();

        while (true)
        {
            cancellationToken.ThrowIfCancellationRequested();

            if (trialDivisionSieve.Candidate.GetBitLength() != bitLength.Value)
            {
                ResetSieveToCandidateOfRequestedBitLength(trialDivisionSieve, bitLength);
                continue;
            }

            if (trialDivisionSieve.CurrentSurvives()
                && primalityTester.IsProbablePrime(
                    trialDivisionSieve.Candidate,
                    generationParameters.MillerRabinWitnessRoundCount,
                    cancellationToken))
            {
                return PrimeNumber.Create(trialDivisionSieve.Candidate, bitLength, timeProvider.GetUtcNow());
            }

            trialDivisionSieve.AdvanceToNextOddCandidate();
            PaceIfWorkSliceElapsed(generationParameters.ProcessorLoadPolicy, workSliceStopwatch, cancellationToken);
        }
    }

    /// <summary>
    /// Подставляет в решето случайного нечётного кандидата нужной битовой длины.
    /// </summary>
    private void ResetSieveToCandidateOfRequestedBitLength(
        OddCandidateTrialDivisionSieve trialDivisionSieve,
        BitLength bitLength)
    {
        BigInteger candidate;
        do
        {
            candidate = primeCandidateSource.NextOddCandidate(bitLength);
        }
        while (candidate.GetBitLength() != bitLength.Value);

        trialDivisionSieve.Reset(candidate);
    }

    /// <summary>
    /// Уступает процессор после кванта работы, чтобы могли выполняться другие процессы.
    /// </summary>
    private void PaceIfWorkSliceElapsed(
        ProcessorLoadPolicy processorLoadPolicy,
        Stopwatch workSliceStopwatch,
        CancellationToken cancellationToken)
    {
        if (workSliceStopwatch.Elapsed < MinimumPacingSlice)
        {
            return;
        }

        processorLoadGovernor.YieldToOtherProcesses(
            processorLoadPolicy,
            workSliceStopwatch.Elapsed,
            cancellationToken);
        workSliceStopwatch.Restart();
    }
}
