import { bitLengthOf, greatestCommonDivisor, leastCommonMultiple, modularInverse } from "@/domain/cryptography/primes/BigIntegerArithmetic";
import type { RsaKeyPair } from "@/domain/cryptography/rsa/RsaKeyPair";

/**
 * Собирает ключ RSA из двух простых, которые пришли от внешнего генератора.
 */
export class RsaKeyPairAssembler {
  public tryAssemble(
    primeP: bigint,
    primeQ: bigint,
    publicExponent: bigint,
    expectedModulusBitLength: number,
  ): RsaKeyPair | null {
    if (primeP === primeQ) {
      return null;
    }

    const modulus = primeP * primeQ;
    if (bitLengthOf(modulus) !== expectedModulusBitLength) {
      return null;
    }

    const carmichaelLambda = leastCommonMultiple(primeP - 1n, primeQ - 1n);
    if (greatestCommonDivisor(publicExponent, carmichaelLambda) !== 1n) {
      return null;
    }

    const privateExponent = modularInverse(publicExponent, carmichaelLambda);
    return {
      publicKey: {
        modulus,
        publicExponent,
        modulusBitLength: expectedModulusBitLength,
      },
      privateKey: {
        modulus,
        publicExponent,
        privateExponent,
        primeP,
        primeQ,
        modulusBitLength: expectedModulusBitLength,
      },
    };
  }

  public tryAssembleFromPool(
    primes: readonly bigint[],
    publicExponent: bigint,
    expectedModulusBitLength: number,
  ): RsaKeyPair | null {
    for (let firstIndex = 0; firstIndex < primes.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < primes.length; secondIndex += 1) {
        const keyPair = this.tryAssemble(
          primes[firstIndex],
          primes[secondIndex],
          publicExponent,
          expectedModulusBitLength,
        );
        if (keyPair) {
          return keyPair;
        }
      }
    }
    return null;
  }
}
