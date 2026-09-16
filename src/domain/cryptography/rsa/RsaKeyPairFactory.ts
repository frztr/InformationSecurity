import { bitLengthOf, greatestCommonDivisor, leastCommonMultiple, modularInverse } from "@/domain/cryptography/primes/BigIntegerArithmetic";
import type { PrimeGenerationParameters } from "@/domain/cryptography/primes/ProbablePrimeNumberGenerator";
import type { ProbablePrimeNumberGenerator } from "@/domain/cryptography/primes/ProbablePrimeNumberGenerator";
import type { RsaKeyPair } from "@/domain/cryptography/rsa/RsaKeyPair";

export class RsaKeyPairFactory {
  public constructor(private readonly primeNumberGenerator: ProbablePrimeNumberGenerator) {}

  public async generateAsync(
    modulusBitLength: number,
    publicExponent: bigint,
    generationParameters: PrimeGenerationParameters,
  ): Promise<RsaKeyPair> {
    if (modulusBitLength < 16 || modulusBitLength % 2 !== 0) {
      throw new Error("Длина модуля RSA должна быть чётной и не меньше 16 бит.");
    }

    const primeBitLength = modulusBitLength / 2;
    let primeP = 0n;
    let primeQ = 0n;
    let modulus = 0n;

    while (bitLengthOf(modulus) !== modulusBitLength) {
      primeP = await this.primeNumberGenerator.generateAsync(primeBitLength, generationParameters);
      do {
        primeQ = await this.primeNumberGenerator.generateAsync(primeBitLength, generationParameters);
      } while (primeP === primeQ);
      modulus = primeP * primeQ;
    }

    const carmichaelLambda = leastCommonMultiple(primeP - 1n, primeQ - 1n);
    if (greatestCommonDivisor(publicExponent, carmichaelLambda) !== 1n) {
      return this.generateAsync(modulusBitLength, publicExponent, generationParameters);
    }

    const privateExponent = modularInverse(publicExponent, carmichaelLambda);
    return {
      publicKey: {
        modulus,
        publicExponent,
        modulusBitLength,
      },
      privateKey: {
        modulus,
        publicExponent,
        privateExponent,
        primeP,
        primeQ,
        modulusBitLength,
      },
    };
  }
}
