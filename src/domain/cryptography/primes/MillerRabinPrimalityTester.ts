import { modularPower } from "@/domain/cryptography/primes/BigIntegerArithmetic";
import type { RandomIntegerSource } from "@/domain/cryptography/primes/RandomIntegerSource";

/**
 * Вероятностный тест Миллера–Рабина со случайными свидетелями.
 * Перенесён из ветки IS-prime-number-generator.
 */
export class MillerRabinPrimalityTester {
  public constructor(private readonly randomIntegerSource: RandomIntegerSource) {}

  public isProbablePrime(numberUnderTest: bigint, millerRabinWitnessRoundCount: number): boolean {
    if (millerRabinWitnessRoundCount < 1) {
      throw new Error("Тест Миллера–Рабина должен использовать хотя бы один раунд со свидетелем.");
    }

    if (numberUnderTest < 2n) {
      return false;
    }
    if (numberUnderTest === 2n || numberUnderTest === 3n) {
      return true;
    }
    if (numberUnderTest % 2n === 0n) {
      return false;
    }

    const numberUnderTestMinusOne = numberUnderTest - 1n;
    let powerOfTwoExponent = 0;
    let oddComponent = numberUnderTestMinusOne;
    while (oddComponent % 2n === 0n) {
      oddComponent /= 2n;
      powerOfTwoExponent += 1;
    }

    for (let roundIndex = 0; roundIndex < millerRabinWitnessRoundCount; roundIndex += 1) {
      const witness = this.randomIntegerSource.nextInclusive(2n, numberUnderTest - 2n);
      let modularPowerValue = modularPower(witness, oddComponent, numberUnderTest);

      if (modularPowerValue === 1n || modularPowerValue === numberUnderTestMinusOne) {
        continue;
      }

      let currentRoundPassed = false;
      for (let squaringIndex = 1; squaringIndex < powerOfTwoExponent; squaringIndex += 1) {
        modularPowerValue = modularPower(modularPowerValue, 2n, numberUnderTest);
        if (modularPowerValue === numberUnderTestMinusOne) {
          currentRoundPassed = true;
          break;
        }
      }

      if (!currentRoundPassed) {
        return false;
      }
    }

    return true;
  }
}
