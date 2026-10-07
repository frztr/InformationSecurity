import { EncryptionMethod } from "@/domain/cryptography/EncryptionMethod";
import { KuznyechikCipher } from "@/domain/cryptography/gost/KuznyechikCipher";
import { parseHexString } from "@/domain/cryptography/HexEncoding";
import { RsaCipher } from "@/domain/cryptography/rsa/RsaCipher";
import { decodeRsaPrivateKeyPkcs1Pem } from "@/domain/cryptography/rsa/RsaPemEncoding";

const KUZNYECHIK_KEY_LENGTH_BYTES = 32;
const KUZNYECHIK_IV_LENGTH_BYTES = 16;

/**
 * Расшифровывает вставленный шифртекст ключом на клиенте, без обращения к серверу.
 * @param method RSA или «Кузнечик».
 * @param ciphertextHex Шифртекст в hex; для «Кузнечика» IV в начале.
 * @param keyText PEM `RSA PRIVATE KEY` либо 32 байта ключа «Кузнечика» в hex.
 * @returns Открытый текст в UTF-8.
 */
export function decryptPastedCiphertext(method: EncryptionMethod, ciphertextHex: string, keyText: string): string {
  const ciphertext = parseHexString(ciphertextHex);
  if (ciphertext.length === 0) {
    throw new Error("Вставьте шифртекст.");
  }

  if (method === EncryptionMethod.RSA) {
    const privateKey = decodeRsaPrivateKeyPkcs1Pem(keyText);
    const plaintextBytes = new RsaCipher().decrypt(ciphertext, privateKey);
    return new TextDecoder().decode(plaintextBytes);
  }

  const key = parseHexString(keyText);
  if (key.length !== KUZNYECHIK_KEY_LENGTH_BYTES) {
    throw new Error("Ключ «Кузнечика» должен занимать 256 бит (64 hex-символа).");
  }
  if (ciphertext.length < KUZNYECHIK_IV_LENGTH_BYTES * 2) {
    throw new Error("Шифртекст «Кузнечика» слишком короткий: нет IV.");
  }
  const plaintextBytes = new KuznyechikCipher(key).decryptCbc(
    ciphertext.subarray(KUZNYECHIK_IV_LENGTH_BYTES),
    ciphertext.subarray(0, KUZNYECHIK_IV_LENGTH_BYTES),
  );
  return new TextDecoder().decode(plaintextBytes);
}
