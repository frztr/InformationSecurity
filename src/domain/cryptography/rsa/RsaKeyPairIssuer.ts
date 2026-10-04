import type { ICollectedPrimeNumberRepository } from "@/domain/cryptography/primes/ICollectedPrimeNumberRepository";
import { RsaKeyPairAssembler } from "@/domain/cryptography/rsa/RsaKeyPairAssembler";
import type { RsaKeyPair } from "@/domain/cryptography/rsa/RsaKeyPair";
import { fail, ok, type Result } from "@/domain/Result";

/**
 * Собирает новую пару RSA из двух простых, ещё не потраченных на другой ключ.
 */
export class RsaKeyPairIssuer {
  public constructor(
    private readonly collectedPrimeNumberRepository: ICollectedPrimeNumberRepository,
    private readonly rsaKeyPairAssembler: RsaKeyPairAssembler,
    private readonly publicExponent: bigint,
    private readonly modulusBitLength: number,
  ) {}

  /**
   * Забирает из пула два простых и собирает пару. Использованные простые удаляются.
   */
  public async takeFreshKeyPair(): Promise<Result<RsaKeyPair>> {
    const primeBitLength = this.modulusBitLength / 2;

    while (true) {
      const storedPrimes = await this.collectedPrimeNumberRepository.listByBitLength(primeBitLength);
      if (storedPrimes.length < 2) {
        return fail("Недостаточно простых из Kafka для нового ключа RSA. Подождите, пока генератор пришлёт ещё два.");
      }

      const firstPrime = storedPrimes[0];
      const secondPrime = storedPrimes[1];
      await this.collectedPrimeNumberRepository.deleteByDecimalValues([
        firstPrime.decimalValue,
        secondPrime.decimalValue,
      ]);

      const keyPair = this.rsaKeyPairAssembler.tryAssemble(
        BigInt(firstPrime.decimalValue),
        BigInt(secondPrime.decimalValue),
        this.publicExponent,
        this.modulusBitLength,
      );
      if (!keyPair) {
        continue;
      }
      return ok(keyPair);
    }
  }
}
