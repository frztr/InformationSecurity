import { buildSmallPrimeNumberTable } from "@/domain/cryptography/primes/SmallPrimeNumberTable";

/**
 * Решето пробного деления: хранит остатки текущего нечётного кандидата по малым простым.
 */
export class OddCandidateTrialDivisionSieve {
  private readonly smallPrimes: readonly number[];
  private remainders: bigint[] = [];
  private currentCandidateValue: bigint = 0n;

  public constructor(trialDivisionPrimeCount: number) {
    this.smallPrimes = buildSmallPrimeNumberTable(trialDivisionPrimeCount);
  }

  public get currentCandidate(): bigint {
    return this.currentCandidateValue;
  }

  public reset(candidate: bigint): void {
    this.currentCandidateValue = candidate;
    this.remainders = this.smallPrimes.map((prime) => candidate % BigInt(prime));
  }

  public currentCandidateSurvives(): boolean {
    for (let index = 0; index < this.smallPrimes.length; index += 1) {
      const prime = BigInt(this.smallPrimes[index]);
      if (this.currentCandidateValue === prime) {
        return true;
      }
      if (this.remainders[index] === 0n && this.currentCandidateValue !== prime) {
        return false;
      }
    }
    return true;
  }

  public advanceToNextOddCandidate(): void {
    this.currentCandidateValue += 2n;
    for (let index = 0; index < this.smallPrimes.length; index += 1) {
      const prime = BigInt(this.smallPrimes[index]);
      this.remainders[index] = (this.remainders[index] + 2n) % prime;
    }
  }
}
