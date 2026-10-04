import type { EncryptedPayload, IMessageEncryptionStrategy } from "@/application/messaging/IMessageEncryptionStrategy";
import { KuznyechikCipher } from "@/domain/cryptography/gost/KuznyechikCipher";
import { parseHexString, toHexString } from "@/domain/cryptography/HexEncoding";
import type { IRandomIntegerSource } from "@/domain/cryptography/primes/IRandomIntegerSource";
import { kuznyechikEncryptionKeyMaterial, type EncryptionKeyMaterial } from "@/domain/messaging/EncryptionKeyMaterial";
import { fail, fromThrowable, type Result } from "@/domain/Result";

const KEY_LENGTH_BYTES = 32;
const INITIALIZATION_VECTOR_LENGTH = 16;

/**
 * Шифрование сообщений «Кузнечик» в режиме CBC. На каждое сообщение — новый ключ и новый вектор инициализации.
 */
export class KuznyechikMessageEncryptionStrategy implements IMessageEncryptionStrategy {
  public constructor(private readonly randomIntegerSource: IRandomIntegerSource) {}

  /**
   * Генерирует ключ и IV, шифрует в CBC. IV записывается в начало шифртекста.
   * @param plaintextBytes Байты открытого текста.
   */
  public async encrypt(plaintextBytes: Uint8Array): Promise<Result<EncryptedPayload>> {
    return fromThrowable(() => {
      const key = this.randomIntegerSource.nextBytes(KEY_LENGTH_BYTES);
      const initializationVector = this.randomIntegerSource.nextBytes(INITIALIZATION_VECTOR_LENGTH);
      const ciphertext = new KuznyechikCipher(key).encryptCbc(plaintextBytes, initializationVector);
      return {
        ciphertextHex: `${toHexString(initializationVector)}${toHexString(ciphertext)}`,
        keyMaterial: kuznyechikEncryptionKeyMaterial(key, initializationVector),
      };
    }, "Ошибка шифрования «Кузнечика»");
  }

  /**
   * Расшифровывает CBC ключом сообщения. IV берётся из начала шифртекста.
   * @param ciphertextHex Конкатенация IV и шифртекста в шестнадцатеричном виде.
   * @param keyMaterial Материалы ключа этого сообщения.
   */
  public async decrypt(ciphertextHex: string, keyMaterial: EncryptionKeyMaterial): Promise<Result<Uint8Array>> {
    if (keyMaterial.method !== "KUZNYECHIK") {
      return fail("Для расшифрования «Кузнечика» нужен его ключ.");
    }

    const ciphertext = fromThrowable(() => parseHexString(ciphertextHex), "Некорректный шифртекст «Кузнечика».");
    if (ciphertext.isError) {
      return ciphertext;
    }
    if (ciphertext.resultDto.length < INITIALIZATION_VECTOR_LENGTH * 2) {
      return fail("Шифртекст «Кузнечика» слишком короткий: нет IV.");
    }

    const key = fromThrowable(() => parseHexString(keyMaterial.keyHex), "Некорректный ключ «Кузнечика».");
    if (key.isError) {
      return key;
    }
    if (key.resultDto.length !== KEY_LENGTH_BYTES) {
      return fail("Ключ «Кузнечика» должен занимать 256 бит (32 байта).");
    }

    return fromThrowable(
      () =>
        new KuznyechikCipher(key.resultDto).decryptCbc(
          ciphertext.resultDto.subarray(INITIALIZATION_VECTOR_LENGTH),
          ciphertext.resultDto.subarray(0, INITIALIZATION_VECTOR_LENGTH),
        ),
      "Ошибка расшифрования «Кузнечика»",
    );
  }
}
