import type { EncryptedPayload, IMessageEncryptionStrategy } from "@/application/messaging/IMessageEncryptionStrategy";
import { parseHexString, toHexString } from "@/domain/cryptography/HexEncoding";
import type { ICollectedPrimeNumberRepository } from "@/domain/cryptography/primes/ICollectedPrimeNumberRepository";
import type { IRandomIntegerSource } from "@/domain/cryptography/primes/IRandomIntegerSource";
import { RsaCipher } from "@/domain/cryptography/rsa/RsaCipher";
import { RsaKeyPairAssembler } from "@/domain/cryptography/rsa/RsaKeyPairAssembler";
import type { RsaKeyPair } from "@/domain/cryptography/rsa/RsaKeyPair";
import { rsaEncryptionKeyMaterial, rsaKeyPairFromMaterial, type EncryptionKeyMaterial } from "@/domain/messaging/EncryptionKeyMaterial";
import { fail, fromThrowable, ok, type Result } from "@/domain/Result";

/**
 * Шифрование сообщений RSA. На каждое сообщение собирается новая пара из двух простых, пришедших из Kafka.
 */
export class RsaMessageEncryptionStrategy implements IMessageEncryptionStrategy {
  public constructor(
    private readonly collectedPrimeNumberRepository: ICollectedPrimeNumberRepository,
    private readonly rsaKeyPairAssembler: RsaKeyPairAssembler,
    private readonly publicExponent: bigint,
    private readonly modulusBitLength: number,
    private readonly randomIntegerSource: IRandomIntegerSource,
  ) {}

  /**
   * Собирает новую пару RSA и шифрует открытым ключом этой пары.
   * @param plaintextBytes Байты открытого текста.
   */
  public async encrypt(plaintextBytes: Uint8Array): Promise<Result<EncryptedPayload>> {
    const keyPair = await this.takeFreshKeyPair();
    if (keyPair.isError) {
      return keyPair;
    }

    return fromThrowable(
      () => ({
        ciphertextHex: toHexString(
          new RsaCipher(this.randomIntegerSource).encrypt(plaintextBytes, keyPair.resultDto.publicKey),
        ),
        keyMaterial: rsaEncryptionKeyMaterial(keyPair.resultDto),
      }),
      "Ошибка шифрования RSA",
    );
  }

  /**
   * Расшифровывает закрытым ключом, сохранённым вместе с сообщением.
   * @param ciphertextHex Шифртекст в шестнадцатеричном виде.
   * @param keyMaterial Материалы ключа этого сообщения.
   */
  public async decrypt(ciphertextHex: string, keyMaterial: EncryptionKeyMaterial): Promise<Result<Uint8Array>> {
    if (keyMaterial.method !== "RSA") {
      return fail("Для расшифрования RSA нужен его ключ.");
    }

    const keyPair = fromThrowable(() => rsaKeyPairFromMaterial(keyMaterial), "Некорректный ключ RSA сообщения.");
    if (keyPair.isError) {
      return keyPair;
    }

    return fromThrowable(
      () => new RsaCipher(this.randomIntegerSource).decrypt(parseHexString(ciphertextHex), keyPair.resultDto.privateKey),
      "Ошибка расшифрования RSA",
    );
  }

  /**
   * Забирает из пула два простых и собирает из них пару. Использованные простые удаляются.
   */
  private async takeFreshKeyPair(): Promise<Result<RsaKeyPair>> {
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
