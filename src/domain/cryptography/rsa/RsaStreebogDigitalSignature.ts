import { bitLengthOf, modularPower, rsaCrtModularPower } from "@/domain/cryptography/primes/BigIntegerArithmetic";
import type { RsaPrivateKey, RsaPublicKey } from "@/domain/cryptography/rsa/RsaKeyPair";
import { Streebog512Hasher } from "@/domain/cryptography/gost/Streebog512Hasher";

/**
 * ЭЦП: Стрибог-512 + RSA PKCS#1 v1.5 ( DigestsInfo заменён на «сырой» 64-байтный хэш ГОСТ ).
 */
export class RsaStreebogDigitalSignature {
  private readonly hasher = new Streebog512Hasher();

  public sign(message: Uint8Array, privateKey: RsaPrivateKey): Uint8Array {
    const digest = this.hasher.hashBytes(message);
    const encodedMessage = this.encodePkcs1Type1(digest, Math.ceil(privateKey.modulusBitLength / 8));
    const signatureInteger = rsaCrtModularPower(
      this.bytesToInteger(encodedMessage),
      privateKey.privateExponent,
      privateKey.primeP,
      privateKey.primeQ,
    );
    return this.integerToFixedBytes(signatureInteger, Math.ceil(privateKey.modulusBitLength / 8));
  }

  public verify(message: Uint8Array, signature: Uint8Array, publicKey: RsaPublicKey): boolean {
    const modulusByteLength = Math.ceil(publicKey.modulusBitLength / 8);
    if (signature.length !== modulusByteLength) {
      return false;
    }

    const signatureInteger = this.bytesToInteger(signature);
    const encodedMessage = this.integerToFixedBytes(
      modularPower(signatureInteger, publicKey.publicExponent, publicKey.modulus),
      modulusByteLength,
    );
    const digest = this.hasher.hashBytes(message);
    const expected = this.encodePkcs1Type1(digest, modulusByteLength);
    return this.constantTimeEquals(encodedMessage, expected);
  }

  private encodePkcs1Type1(digest: Uint8Array, modulusByteLength: number): Uint8Array {
    const paddingLength = modulusByteLength - digest.length - 3;
    if (paddingLength < 8) {
      throw new Error("Модуль RSA слишком короткий для подписи Стрибог-512.");
    }

    const encoded = new Uint8Array(modulusByteLength);
    encoded[0] = 0x00;
    encoded[1] = 0x01;
    encoded.fill(0xff, 2, 2 + paddingLength);
    encoded[2 + paddingLength] = 0x00;
    encoded.set(digest, 3 + paddingLength);
    return encoded;
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

  private constantTimeEquals(left: Uint8Array, right: Uint8Array): boolean {
    if (left.length !== right.length) {
      return false;
    }
    let difference = 0;
    for (let index = 0; index < left.length; index += 1) {
      difference |= left[index] ^ right[index];
    }
    return difference === 0;
  }
}
