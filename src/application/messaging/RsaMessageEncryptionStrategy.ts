import type { EncryptedPayload, IMessageEncryptionStrategy } from "@/application/messaging/IMessageEncryptionStrategy";
import { parseHexString, toHexString } from "@/domain/cryptography/HexEncoding";
import type { IRandomIntegerSource } from "@/domain/cryptography/primes/IRandomIntegerSource";
import { RsaCipher } from "@/domain/cryptography/rsa/RsaCipher";
import type { RsaKeyPairIssuer } from "@/domain/cryptography/rsa/RsaKeyPairIssuer";
import { rsaEncryptionKeyMaterial, rsaKeyPairFromMaterial, type EncryptionKeyMaterial } from "@/domain/messaging/EncryptionKeyMaterial";
import { fail, fromThrowable, type Result } from "@/domain/Result";

/**
 * Шифрование сообщений RSA. На каждое сообщение собирается новая пара из двух простых, пришедших из Kafka.
 */
export class RsaMessageEncryptionStrategy implements IMessageEncryptionStrategy {
  public constructor(
    private readonly rsaKeyPairIssuer: RsaKeyPairIssuer,
    private readonly randomIntegerSource: IRandomIntegerSource,
  ) {}

  /**
   * Собирает новую пару RSA и шифрует открытым ключом этой пары.
   * @param plaintextBytes Байты открытого текста.
   */
  public async encrypt(plaintextBytes: Uint8Array): Promise<Result<EncryptedPayload>> {
    const keyPair = await this.rsaKeyPairIssuer.takeFreshKeyPair();
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
}
