import type { RsaPrivateKey } from "@/domain/cryptography/rsa/RsaKeyPair";

const RSA_ENCRYPTION_OID = Uint8Array.from([0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01]);
const ASN1_NULL = Uint8Array.from([0x05, 0x00]);

/**
 * Кодирует открытый ключ RSA в PEM SPKI (SubjectPublicKeyInfo).
 * @param modulus Модуль n.
 * @param publicExponent Открытая экспонента e.
 * @returns PEM-блок PUBLIC KEY.
 */
export function encodeRsaPublicKeySpkiPem(modulus: bigint, publicExponent: bigint): string {
  const rsaPublicKey = encodeSequence(encodeInteger(modulus), encodeInteger(publicExponent));
  const algorithm = encodeSequence(RSA_ENCRYPTION_OID, ASN1_NULL);
  const subjectPublicKeyInfo = encodeSequence(algorithm, encodeBitString(rsaPublicKey));
  return encodePem("PUBLIC KEY", subjectPublicKeyInfo);
}

/**
 * Кодирует закрытый ключ RSA в PEM PKCS#1 из уже посчитанных полей ключа.
 * @param privateKey Закрытый ключ PKCS#1.
 * @returns PEM-блок RSA PRIVATE KEY.
 */
export function encodeRsaPrivateKeyPkcs1Pem(privateKey: RsaPrivateKey): string {
  const rsaPrivateKey = encodeSequence(
    encodeInteger(BigInt(privateKey.version)),
    encodeInteger(privateKey.modulus),
    encodeInteger(privateKey.publicExponent),
    encodeInteger(privateKey.privateExponent),
    encodeInteger(privateKey.primeP),
    encodeInteger(privateKey.primeQ),
    encodeInteger(privateKey.dp),
    encodeInteger(privateKey.dq),
    encodeInteger(privateKey.qInv),
  );
  return encodePem("RSA PRIVATE KEY", rsaPrivateKey);
}

function encodePem(label: string, der: Uint8Array): string {
  const body = bytesToBase64(der).match(/.{1,64}/g)?.join("\n") ?? "";
  return `-----BEGIN ${label}-----\n${body}\n-----END ${label}-----`;
}

function encodeInteger(value: bigint): Uint8Array {
  if (value < 0n) {
    throw new Error("ASN.1 INTEGER для RSA не может быть отрицательным.");
  }
  const unsigned = integerToUnsignedBytes(value);
  const needsSignPadding = (unsigned[0] & 0x80) !== 0;
  const content = needsSignPadding ? concat(Uint8Array.from([0x00]), unsigned) : unsigned;
  return encodeTlv(0x02, content);
}

function encodeBitString(bytes: Uint8Array): Uint8Array {
  return encodeTlv(0x03, concat(Uint8Array.from([0x00]), bytes));
}

function encodeSequence(...parts: Uint8Array[]): Uint8Array {
  return encodeTlv(0x30, concat(...parts));
}

function encodeTlv(tag: number, content: Uint8Array): Uint8Array {
  return concat(Uint8Array.from([tag]), encodeLength(content.length), content);
}

function encodeLength(length: number): Uint8Array {
  if (length < 0x80) {
    return Uint8Array.from([length]);
  }
  const bytes: number[] = [];
  let remaining = length;
  while (remaining > 0) {
    bytes.unshift(remaining & 0xff);
    remaining >>= 8;
  }
  return Uint8Array.from([0x80 | bytes.length, ...bytes]);
}

function integerToUnsignedBytes(value: bigint): Uint8Array {
  if (value === 0n) {
    return Uint8Array.from([0x00]);
  }
  let hex = value.toString(16);
  if (hex.length % 2 === 1) {
    hex = `0${hex}`;
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

function bytesToBase64(bytes: Uint8Array): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let output = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const remaining = bytes.length - index;
    const first = bytes[index];
    const second = remaining > 1 ? bytes[index + 1] : 0;
    const third = remaining > 2 ? bytes[index + 2] : 0;
    output += alphabet[first >> 2];
    output += alphabet[((first & 3) << 4) | (second >> 4)];
    output += remaining > 1 ? alphabet[((second & 15) << 2) | (third >> 6)] : "=";
    output += remaining > 2 ? alphabet[third & 63] : "=";
  }
  return output;
}
