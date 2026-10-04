import { bigEndianIntegerToBytes, bytesToBigEndianInteger, modularPower, rsaCrtModularPower } from "@/domain/cryptography/primes/BigIntegerArithmetic";
import type { IRandomIntegerSource } from "@/domain/cryptography/primes/IRandomIntegerSource";
import { encodePkcs1Block } from "@/domain/cryptography/rsa/Pkcs1Encoding";
import { rsaModulusByteLength, type RsaPrivateKey, type RsaPublicKey } from "@/domain/cryptography/rsa/RsaKeyPair";

/**
 * RSA с дополнением PKCS#1 v1.5. Длина модуля по умолчанию — 32768 бит.
 */
export class RsaCipher {
  public constructor(private readonly randomIntegerSource: IRandomIntegerSource) {}

  /**
   * Шифрует данные открытым ключом с дополнением PKCS#1 v1.5 (тип 2).
   * Длинные сообщения разбиваются на блоки.
   * @param plaintext Открытый текст.
   * @param publicKey Открытый ключ RSA.
   * @returns Конкатенация шифрблоков длины модуля.
   */
  public encrypt(plaintext: Uint8Array, publicKey: RsaPublicKey): Uint8Array {
    const modulusByteLength = rsaModulusByteLength(publicKey.modulus);
    const maximumChunkLength = modulusByteLength - 11;
    if (maximumChunkLength < 1) {
      throw new Error("Модуль RSA слишком короткий для PKCS#1 v1.5.");
    }

    const encryptedChunks: Uint8Array[] = [];
    for (let offset = 0; offset < plaintext.length; offset += maximumChunkLength) {
      const chunk = plaintext.subarray(offset, offset + maximumChunkLength);
      encryptedChunks.push(this.encryptSingleBlock(chunk, publicKey, modulusByteLength));
    }

    const result = new Uint8Array(encryptedChunks.length * modulusByteLength);
    encryptedChunks.forEach((chunk, index) => {
      result.set(chunk, index * modulusByteLength);
    });
    return result;
  }

  /**
   * Расшифровывает данные закрытым ключом (CRT) и снимает PKCS#1 v1.5.
   * @param ciphertext Шифртекст, кратный длине модуля.
   * @param privateKey Закрытый ключ RSA.
   * @returns Открытый текст.
   */
  public decrypt(ciphertext: Uint8Array, privateKey: RsaPrivateKey): Uint8Array {
    const modulusByteLength = rsaModulusByteLength(privateKey.modulus);
    if (ciphertext.length === 0 || ciphertext.length % modulusByteLength !== 0) {
      throw new Error("Длина шифртекста RSA должна быть кратна длине модуля.");
    }

    const plaintextChunks: Uint8Array[] = [];
    for (let offset = 0; offset < ciphertext.length; offset += modulusByteLength) {
      const block = ciphertext.subarray(offset, offset + modulusByteLength);
      plaintextChunks.push(this.decryptSingleBlock(block, privateKey, modulusByteLength));
    }

    const totalLength = plaintextChunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let writeOffset = 0;
    for (const chunk of plaintextChunks) {
      result.set(chunk, writeOffset);
      writeOffset += chunk.length;
    }
    return result;
  }

  /**
   * Шифрует один блок с кодированием PKCS#1 type 2.
   * @param plaintext Открытый фрагмент, умещающийся в один блок.
   * @param publicKey Открытый ключ RSA.
   * @param modulusByteLength Длина модуля в байтах.
   * @returns Шифрблок длины модуля.
   */
  private encryptSingleBlock(plaintext: Uint8Array, publicKey: RsaPublicKey, modulusByteLength: number): Uint8Array {
    const encodedMessage = this.encodePkcs1Type2(plaintext, modulusByteLength);
    const messageInteger = bytesToBigEndianInteger(encodedMessage);
    const cipherInteger = modularPower(messageInteger, publicKey.publicExponent, publicKey.modulus);
    return bigEndianIntegerToBytes(cipherInteger, modulusByteLength);
  }

  /**
   * Расшифровывает один блок через CRT и декодирует PKCS#1 type 2.
   * @param cipherBlock Шифрблок длины модуля.
   * @param privateKey Закрытый ключ RSA.
   * @param modulusByteLength Длина модуля в байтах.
   * @returns Открытый фрагмент без дополнения.
   */
  private decryptSingleBlock(cipherBlock: Uint8Array, privateKey: RsaPrivateKey, modulusByteLength: number): Uint8Array {
    const cipherInteger = bytesToBigEndianInteger(cipherBlock);
    const messageInteger = rsaCrtModularPower(
      cipherInteger,
      privateKey.primeP,
      privateKey.primeQ,
      privateKey.dp,
      privateKey.dq,
      privateKey.qInv,
    );
    const encodedMessage = bigEndianIntegerToBytes(messageInteger, modulusByteLength);
    return this.decodePkcs1Type2(encodedMessage);
  }

  /**
   * Кодирует сообщение по PKCS#1 v1.5 type 2 (случайное ненулевое дополнение).
   * @param message Открытый фрагмент.
   * @param modulusByteLength Длина модуля в байтах.
   * @returns Блок EM длины модуля.
   */
  private encodePkcs1Type2(message: Uint8Array, modulusByteLength: number): Uint8Array {
    return encodePkcs1Block(
      0x02,
      message,
      modulusByteLength,
      (padding) => {
        for (let index = 0; index < padding.length; index += 1) {
          padding[index] = this.nextNonZeroRandomByte();
        }
      },
      "Сообщение слишком длинное для одного блока RSA.",
    );
  }

  /**
   * Снимает кодирование PKCS#1 v1.5 type 2.
   * @param encodedMessage Блок EM длины модуля.
   * @returns Исходный открытый фрагмент.
   */
  private decodePkcs1Type2(encodedMessage: Uint8Array): Uint8Array {
    if (encodedMessage[0] !== 0x00 || encodedMessage[1] !== 0x02) {
      throw new Error("Некорректное дополнение PKCS#1 v1.5.");
    }

    let separatorIndex = 2;
    while (separatorIndex < encodedMessage.length && encodedMessage[separatorIndex] !== 0x00) {
      separatorIndex += 1;
    }
    if (separatorIndex < 10 || separatorIndex >= encodedMessage.length) {
      throw new Error("Некорректное дополнение PKCS#1 v1.5.");
    }

    return encodedMessage.subarray(separatorIndex + 1);
  }

  /**
   * Возвращает случайный байт из диапазона 1…255 для PKCS#1 type 2.
   */
  private nextNonZeroRandomByte(): number {
    const buffer = new Uint8Array(1);
    do {
      this.randomIntegerSource.fillBytes(buffer);
    } while (buffer[0] === 0);
    return buffer[0];
  }
}
