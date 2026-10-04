import { constantTimeEquals } from "@/domain/cryptography/ConstantTimeComparison";
import { Streebog512Hasher } from "@/domain/cryptography/gost/Streebog512Hasher";
import {
  bigEndianIntegerToBytes,
  bytesToBigEndianInteger,
  modularPower,
  rsaCrtModularPower,
} from "@/domain/cryptography/primes/BigIntegerArithmetic";
import { encodePkcs1Block } from "@/domain/cryptography/rsa/Pkcs1Encoding";
import { rsaModulusByteLength, type RsaPrivateKey, type RsaPublicKey } from "@/domain/cryptography/rsa/RsaKeyPair";

/**
 * ЭЦП: Стрибог-512 и RSA PKCS#1 v1.5. Вместо DigestInfo подставляется «сырой» 64-байтный хэш ГОСТ.
 */
export class RsaStreebogDigitalSignature {
  private readonly hasher = new Streebog512Hasher();

  /**
   * Подписывает сообщение закрытым ключом.
   * @param message Подписываемые байты.
   * @param privateKey Закрытый ключ RSA.
   * @returns Подпись длины модуля.
   */
  public sign(message: Uint8Array, privateKey: RsaPrivateKey): Uint8Array {
    const digest = this.hasher.hashBytes(message);
    const modulusByteLength = rsaModulusByteLength(privateKey.modulus);
    const encodedMessage = encodePkcs1Type1(digest, modulusByteLength);
    const signatureInteger = rsaCrtModularPower(
      bytesToBigEndianInteger(encodedMessage),
      privateKey.primeP,
      privateKey.primeQ,
      privateKey.dp,
      privateKey.dq,
      privateKey.qInv,
    );
    return bigEndianIntegerToBytes(signatureInteger, modulusByteLength);
  }

  /**
   * Проверяет подпись открытым ключом.
   * @param message Исходное сообщение.
   * @param signature Проверяемая подпись.
   * @param publicKey Открытый ключ RSA.
   * @returns true, если подпись верна.
   */
  public verify(message: Uint8Array, signature: Uint8Array, publicKey: RsaPublicKey): boolean {
    const modulusByteLength = rsaModulusByteLength(publicKey.modulus);
    if (signature.length !== modulusByteLength) {
      return false;
    }

    const signatureInteger = bytesToBigEndianInteger(signature);
    const encodedMessage = bigEndianIntegerToBytes(
      modularPower(signatureInteger, publicKey.publicExponent, publicKey.modulus),
      modulusByteLength,
    );
    const digest = this.hasher.hashBytes(message);
    const expected = encodePkcs1Type1(digest, modulusByteLength);
    return constantTimeEquals(encodedMessage, expected);
  }
}

/**
 * Кодирует дайджест по PKCS#1 v1.5 type 1 без DigestInfo.
 * @param digest 64-байтный хэш Стрибог-512.
 * @param modulusByteLength Длина модуля в байтах.
 * @returns Блок EM длины модуля.
 */
function encodePkcs1Type1(digest: Uint8Array, modulusByteLength: number): Uint8Array {
  return encodePkcs1Block(
    0x01,
    digest,
    modulusByteLength,
    (padding) => padding.fill(0xff),
    "Модуль RSA слишком короткий для подписи Стрибог-512.",
  );
}
