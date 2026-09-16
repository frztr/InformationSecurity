import { bitLengthOf } from "@/domain/cryptography/primes/BigIntegerArithmetic";
import type { CryptographicOddPrimeCandidateSource } from "@/domain/cryptography/primes/CryptographicOddPrimeCandidateSource";
import type { MillerRabinPrimalityTester } from "@/domain/cryptography/primes/MillerRabinPrimalityTester";
import { OddCandidateTrialDivisionSieve } from "@/domain/cryptography/primes/OddCandidateTrialDivisionSieve";

export type PrimeGenerationParameters = {
  millerRabinWitnessRoundCount: number;
  trialDivisionPrimeCount: number;
};

/**
 * Ищет вероятностно простое число пробным делением и тестом Миллера–Рабина.
 * Между попытками уступает цикл событий, чтобы HTTP-сервер оставался живым.
 */
export class ProbablePrimeNumberGenerator {
  public constructor(
    private readonly primeCandidateSource: CryptographicOddPrimeCandidateSource,
    private readonly primalityTester: MillerRabinPrimalityTester,
  ) {}

  public async generateAsync(bitLength: number, generationParameters: PrimeGenerationParameters): Promise<bigint> {
    const trialDivisionSieve = new OddCandidateTrialDivisionSieve(generationParameters.trialDivisionPrimeCount);
    this.resetSieveToCandidateOfRequestedBitLength(trialDivisionSieve, bitLength);

    let attemptsSinceYield = 0;
    while (true) {
      if (bitLengthOf(trialDivisionSieve.currentCandidate) !== bitLength) {
        this.resetSieveToCandidateOfRequestedBitLength(trialDivisionSieve, bitLength);
        continue;
      }

      if (
        trialDivisionSieve.currentCandidateSurvives() &&
        this.primalityTester.isProbablePrime(
          trialDivisionSieve.currentCandidate,
          generationParameters.millerRabinWitnessRoundCount,
        )
      ) {
        return trialDivisionSieve.currentCandidate;
      }

      trialDivisionSieve.advanceToNextOddCandidate();
      attemptsSinceYield += 1;
      if (attemptsSinceYield >= 32) {
        attemptsSinceYield = 0;
        await new Promise<void>((resolve) => setImmediate(resolve));
      }
    }
  }

  private resetSieveToCandidateOfRequestedBitLength(
    trialDivisionSieve: OddCandidateTrialDivisionSieve,
    bitLength: number,
  ): void {
    let candidate: bigint;
    do {
      candidate = this.primeCandidateSource.nextOddCandidate(bitLength);
    } while (bitLengthOf(candidate) !== bitLength);
    trialDivisionSieve.reset(candidate);
  }
}
