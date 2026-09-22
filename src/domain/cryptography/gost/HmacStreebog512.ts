import { Streebog512Hasher } from "@/domain/cryptography/gost/Streebog512Hasher";

const BLOCK_SIZE_BYTES = 64;
const INNER_PAD_BYTE = 0x36;
const OUTER_PAD_BYTE = 0x5c;

/**
 * HMAC на Стрибог-512 (RFC 2104 + ГОСТ Р 34.11-2012).
 */
export class HmacStreebog512 {
  public constructor(private readonly hasher: Streebog512Hasher = new Streebog512Hasher()) {}

  /**
   * Вычисляет HMAC-Стрибог-512 для сообщения.
   * @param key Секретный ключ.
   * @param message Сообщение.
   * @returns 64-байтный код аутентификации.
   */
  public digest(key: Uint8Array, message: Uint8Array): Uint8Array {
    const blockKey = this.blockSizedKey(key);
    const innerKey = this.xorWithByte(blockKey, INNER_PAD_BYTE);
    const outerKey = this.xorWithByte(blockKey, OUTER_PAD_BYTE);
    const innerHash = this.hasher.hashBytes(this.concat(innerKey, message));
    return this.hasher.hashBytes(this.concat(outerKey, innerHash));
  }

  /**
   * Приводит ключ к длине блока HMAC: хэширует, если длиннее, и дополняет нулями.
   * @param key Исходный ключ.
   */
  private blockSizedKey(key: Uint8Array): Uint8Array {
    const material = key.length > BLOCK_SIZE_BYTES ? this.hasher.hashBytes(key) : key;
    const padded = new Uint8Array(BLOCK_SIZE_BYTES);
    padded.set(material);
    return padded;
  }

  /**
   * Покомпонентно складывает блок с константой по модулю 2.
   * @param block Блок ключа длины 64 байта.
   * @param padByte Байт ipad или opad.
   */
  private xorWithByte(block: Uint8Array, padByte: number): Uint8Array {
    const padded = new Uint8Array(block.length);
    for (let index = 0; index < block.length; index += 1) {
      padded[index] = block[index] ^ padByte;
    }
    return padded;
  }

  /**
   * Конкатенирует два массива байт.
   * @param left Левый фрагмент.
   * @param right Правый фрагмент.
   */
  private concat(left: Uint8Array, right: Uint8Array): Uint8Array {
    const combined = new Uint8Array(left.length + right.length);
    combined.set(left);
    combined.set(right, left.length);
    return combined;
  }
}
