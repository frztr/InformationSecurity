import { bitLengthOf, greatestCommonDivisor, leastCommonMultiple, modularInverse } from "@/domain/cryptography/primes/BigIntegerArithmetic";
import { createRsaPrivateKey, type RsaKeyPair } from "@/domain/cryptography/rsa/RsaKeyPair";

/**
 * Собирает ключ RSA из двух простых.
 */
export class RsaKeyPairAssembler {
  /**
   * Собирает пару ключей из двух простых, если модуль имеет нужную длину и e взаимно просто с λ(n).
   * @param primeP Первое простое.
   * @param primeQ Второе простое.
   * @param publicExponent Открытая экспонента e.
   * @param expectedModulusBitLength Ожидаемая длина модуля в битах.
   * @returns Пара ключей либо null, если условия не выполнены.
   */
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
    const publicKey = { modulus, publicExponent };
    return {
      publicKey,
      privateKey: createRsaPrivateKey(modulus, publicExponent, privateExponent, primeP, primeQ),
    };
  }

  /**
   * Подбирает пару различных простых из пула, из которой собирается ключ.
   * @param primes Кандидаты простых.
   * @param publicExponent Открытая экспонента e.
   * @param expectedModulusBitLength Ожидаемая длина модуля в битах.
   * @returns Первая успешная пара ключей либо null.
   */
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
