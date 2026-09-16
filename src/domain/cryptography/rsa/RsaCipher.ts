import { bitLengthOf, modularPower, rsaCrtModularPower } from "@/domain/cryptography/primes/BigIntegerArithmetic";
import type { RandomIntegerSource } from "@/domain/cryptography/primes/RandomIntegerSource";
import type { RsaPrivateKey, RsaPublicKey } from "@/domain/cryptography/rsa/RsaKeyPair";

/**
 * RSA с дополнением PKCS#1 v1.5. Длина модуля по умолчанию — 32768 бит.
 */
export class RsaCipher {
  public constructor(private readonly randomIntegerSource: RandomIntegerSource) {}

  public encrypt(plaintext: Uint8Array, publicKey: RsaPublicKey): Uint8Array {
    const modulusByteLength = Math.ceil(publicKey.modulusBitLength / 8);
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

  public decrypt(ciphertext: Uint8Array, privateKey: RsaPrivateKey): Uint8Array {
    const modulusByteLength = Math.ceil(privateKey.modulusBitLength / 8);
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

  private encryptSingleBlock(plaintext: Uint8Array, publicKey: RsaPublicKey, modulusByteLength: number): Uint8Array {
    const encodedMessage = this.encodePkcs1Type2(plaintext, modulusByteLength);
    const messageInteger = this.bytesToInteger(encodedMessage);
    const cipherInteger = modularPower(messageInteger, publicKey.publicExponent, publicKey.modulus);
    return this.integerToFixedBytes(cipherInteger, modulusByteLength);
  }

  private decryptSingleBlock(cipherBlock: Uint8Array, privateKey: RsaPrivateKey, modulusByteLength: number): Uint8Array {
    const cipherInteger = this.bytesToInteger(cipherBlock);
    const messageInteger = rsaCrtModularPower(
      cipherInteger,
      privateKey.privateExponent,
      privateKey.primeP,
      privateKey.primeQ,
    );
    const encodedMessage = this.integerToFixedBytes(messageInteger, modulusByteLength);
    return this.decodePkcs1Type2(encodedMessage);
  }

  private encodePkcs1Type2(message: Uint8Array, modulusByteLength: number): Uint8Array {
    const paddingLength = modulusByteLength - message.length - 3;
    if (paddingLength < 8) {
      throw new Error("Сообщение слишком длинное для одного блока RSA.");
    }

    const encoded = new Uint8Array(modulusByteLength);
    encoded[0] = 0x00;
    encoded[1] = 0x02;
    for (let index = 0; index < paddingLength; index += 1) {
      encoded[2 + index] = this.nextNonZeroRandomByte();
    }
    encoded[2 + paddingLength] = 0x00;
    encoded.set(message, 3 + paddingLength);
    return encoded;
  }

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

  private nextNonZeroRandomByte(): number {
    const buffer = new Uint8Array(1);
    do {
      this.randomIntegerSource.fillBytes(buffer);
    } while (buffer[0] === 0);
    return buffer[0];
  }

  private bytesToInteger(bytes: Uint8Array): bigint {
    let value = 0n;
    for (const byte of bytes) {
      value = (value << 8n) | BigInt(byte);
    }
    return value;
  }

  private integerToFixedBytes(value: bigint, byteLength: number): Uint8Array {
    if (bitLengthOf(value) > byteLength * 8) {
      throw new Error("Целое число не помещается в запрошенную длину блока RSA.");
    }
    const bytes = new Uint8Array(byteLength);
    let remaining = value;
    for (let index = byteLength - 1; index >= 0; index -= 1) {
      bytes[index] = Number(remaining & 0xffn);
      remaining >>= 8n;
    }
    return bytes;
  }
}
