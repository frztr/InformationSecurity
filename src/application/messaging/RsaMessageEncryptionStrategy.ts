import type { EncryptedPayload, IMessageEncryptionStrategy } from "@/application/messaging/IMessageEncryptionStrategy";
import { parseHexString, toHexString } from "@/domain/cryptography/HexEncoding";
import type { IRandomIntegerSource } from "@/domain/cryptography/primes/IRandomIntegerSource";
import { RsaCipher } from "@/domain/cryptography/rsa/RsaCipher";
import type { ISystemRsaKeyStore } from "@/domain/cryptography/rsa/ISystemRsaKeyStore";
import { rsaEncryptionKeyMaterial } from "@/domain/messaging/EncryptionKeyMaterial";
import { fail, fromThrowable, ok, type Result } from "@/domain/Result";

/**
 * Шифрование сообщений RSA с системной парой ключей.
 */
export class RsaMessageEncryptionStrategy implements IMessageEncryptionStrategy {
  public constructor(
    private readonly systemRsaKeyStore: ISystemRsaKeyStore,
    private readonly randomIntegerSource: IRandomIntegerSource,
  ) {}

  /**
   * Шифрует открытым ключом системной пары RSA.
   * @param plaintextBytes Байты открытого текста.
   */
  public async encrypt(plaintextBytes: Uint8Array): Promise<Result<EncryptedPayload>> {
    const keyPair = await this.requireKeyPair("Ключи RSA ещё собираются из простых Kafka. Подождите или используйте «Кузнечик».");
    if (keyPair.isError) {
      return keyPair;
    }

    return fromThrowable(
      () => ({
        ciphertextHex: toHexString(new RsaCipher(this.randomIntegerSource).encrypt(plaintextBytes, keyPair.resultDto.publicKey)),
        keyMaterial: rsaEncryptionKeyMaterial(keyPair.resultDto),
      }),
      "Ошибка шифрования RSA",
    );
  }

  /**
   * Расшифровывает закрытым ключом системной пары RSA.
   * @param ciphertextHex Шифртекст в шестнадцатеричном виде.
   */
  public async decrypt(ciphertextHex: string): Promise<Result<Uint8Array>> {
    const keyPair = await this.requireKeyPair("Ключи RSA ещё не готовы.");
    if (keyPair.isError) {
      return keyPair;
    }

    return fromThrowable(
      () => new RsaCipher(this.randomIntegerSource).decrypt(parseHexString(ciphertextHex), keyPair.resultDto.privateKey),
      "Ошибка расшифрования RSA",
    );
  }

  /**
   * Возвращает системную пару RSA или отказ, если ключи ещё не собраны.
   * @param missingKeysMessage Текст отказа при отсутствии ключей.
   */
  private async requireKeyPair(missingKeysMessage: string) {
    const keyPair = await this.systemRsaKeyStore.tryGetKeyPair();
    if (!keyPair) {
      return fail(missingKeysMessage);
    }
    return ok(keyPair);
  }
}
