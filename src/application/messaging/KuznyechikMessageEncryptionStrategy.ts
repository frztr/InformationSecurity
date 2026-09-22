import type { EncryptedPayload, IMessageEncryptionStrategy } from "@/application/messaging/IMessageEncryptionStrategy";
import { KuznyechikCipher } from "@/domain/cryptography/gost/KuznyechikCipher";
import { parseHexString, toHexString } from "@/domain/cryptography/HexEncoding";
import type { IRandomIntegerSource } from "@/domain/cryptography/primes/IRandomIntegerSource";
import { kuznyechikEncryptionKeyMaterial } from "@/domain/messaging/EncryptionKeyMaterial";
import { fail, fromThrowable, type Result } from "@/domain/Result";

const INITIALIZATION_VECTOR_LENGTH = 16;

/**
 * Шифрование сообщений «Кузнечик» в режиме CBC с системным ключом.
 */
export class KuznyechikMessageEncryptionStrategy implements IMessageEncryptionStrategy {
  public constructor(
    private readonly masterKey: Uint8Array,
    private readonly randomIntegerSource: IRandomIntegerSource,
  ) {}

  /**
   * Шифрует в CBC; IV записывается в начало шифртекста.
   * @param plaintextBytes Байты открытого текста.
   */
  public async encrypt(plaintextBytes: Uint8Array): Promise<Result<EncryptedPayload>> {
    return fromThrowable(() => {
      const initializationVector = this.randomIntegerSource.nextBytes(INITIALIZATION_VECTOR_LENGTH);
      const ciphertext = new KuznyechikCipher(this.masterKey).encryptCbc(plaintextBytes, initializationVector);
      return {
        ciphertextHex: `${toHexString(initializationVector)}${toHexString(ciphertext)}`,
        keyMaterial: kuznyechikEncryptionKeyMaterial(this.masterKey, initializationVector),
      };
    }, "Ошибка шифрования «Кузнечика»");
  }

  /**
   * Расшифровывает CBC, IV берётся из начала шифртекста.
   * @param ciphertextHex Конкатенация IV и шифртекста в шестнадцатеричном виде.
   */
  public async decrypt(ciphertextHex: string): Promise<Result<Uint8Array>> {
    const ciphertext = fromThrowable(() => parseHexString(ciphertextHex), "Некорректный шифртекст «Кузнечика».");
    if (ciphertext.isError) {
      return ciphertext;
    }
    if (ciphertext.resultDto.length < INITIALIZATION_VECTOR_LENGTH * 2) {
      return fail("Шифртекст «Кузнечика» слишком короткий: нет IV.");
    }
    return fromThrowable(
      () =>
        new KuznyechikCipher(this.masterKey).decryptCbc(
          ciphertext.resultDto.subarray(INITIALIZATION_VECTOR_LENGTH),
          ciphertext.resultDto.subarray(0, INITIALIZATION_VECTOR_LENGTH),
        ),
      "Ошибка расшифрования «Кузнечика»",
    );
  }
}
