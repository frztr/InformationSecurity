import { EncryptionMethod, type EncryptionMethod as EncryptionMethodName } from "@/domain/cryptography/EncryptionMethod";
import { toHexString } from "@/domain/cryptography/HexEncoding";
import { bitLengthOf } from "@/domain/cryptography/primes/BigIntegerArithmetic";
import { encodeRsaPrivateKeyPkcs1Pem, encodeRsaPublicKeySpkiPem } from "@/domain/cryptography/rsa/RsaPemEncoding";
import { createRsaPrivateKey, type RsaKeyPair } from "@/domain/cryptography/rsa/RsaKeyPair";

/**
 * Материалы ключа RSA, сохранённые вместе с сообщением.
 */
export type RsaEncryptionKeyMaterial = {
  method: "RSA";
  version: 0;
  publicExponent: string;
  modulusHex: string;
  privateExponentHex: string;
  primePHex: string;
  primeQHex: string;
  dpHex: string;
  dqHex: string;
  qInvHex: string;
  publicKeyPem: string;
  privateKeyPem: string;
};

/**
 * Материалы ключа «Кузнечик»: ключ и вектор инициализации CBC.
 */
export type KuznyechikEncryptionKeyMaterial = {
  method: "KUZNYECHIK";
  keyHex: string;
  ivHex: string;
};

/** Материалы ключа шифрования сообщения. */
export type EncryptionKeyMaterial = RsaEncryptionKeyMaterial | KuznyechikEncryptionKeyMaterial;

/**
 * Шестнадцатеричная запись целого с чётной длиной.
 * @param value Неотрицательное целое.
 */
function bigintToEvenHex(value: bigint): string {
  const hex = value.toString(16);
  return hex.length % 2 === 0 ? hex : `0${hex}`;
}

/**
 * Битовая длина модуля из шестнадцатеричной записи n.
 * @param material Материалы RSA.
 */
export function rsaKeyMaterialModulusBitLength(material: RsaEncryptionKeyMaterial): number {
  return bitLengthOf(BigInt(`0x${material.modulusHex}`));
}

/**
 * Собирает материалы ключа из системной пары RSA.
 * @param keyPair Пара ключей.
 */
export function rsaEncryptionKeyMaterial(keyPair: RsaKeyPair): RsaEncryptionKeyMaterial {
  const { publicKey, privateKey } = keyPair;
  return {
    method: EncryptionMethod.RSA,
    version: privateKey.version,
    publicExponent: publicKey.publicExponent.toString(),
    modulusHex: bigintToEvenHex(publicKey.modulus),
    privateExponentHex: bigintToEvenHex(privateKey.privateExponent),
    primePHex: bigintToEvenHex(privateKey.primeP),
    primeQHex: bigintToEvenHex(privateKey.primeQ),
    dpHex: bigintToEvenHex(privateKey.dp),
    dqHex: bigintToEvenHex(privateKey.dq),
    qInvHex: bigintToEvenHex(privateKey.qInv),
    publicKeyPem: encodeRsaPublicKeySpkiPem(publicKey.modulus, publicKey.publicExponent),
    privateKeyPem: encodeRsaPrivateKeyPkcs1Pem(privateKey),
  };
}

/**
 * Дописывает PEM и CRT-поля, если в JSON их ещё нет.
 * @param material Частично заполненные материалы RSA.
 */
function completeRsaKeyMaterial(material: {
  publicExponent: string;
  modulusHex: string;
  privateExponentHex: string;
  primePHex: string;
  primeQHex: string;
  dpHex?: string;
  dqHex?: string;
  qInvHex?: string;
  publicKeyPem?: string;
  privateKeyPem?: string;
}): RsaEncryptionKeyMaterial {
  const modulus = BigInt(`0x${material.modulusHex}`);
  const publicExponent = BigInt(material.publicExponent);
  const privateExponent = BigInt(`0x${material.privateExponentHex}`);
  const primeP = BigInt(`0x${material.primePHex}`);
  const primeQ = BigInt(`0x${material.primeQHex}`);
  const privateKey =
    material.dpHex && material.dqHex && material.qInvHex
      ? {
          version: 0 as const,
          modulus,
          publicExponent,
          privateExponent,
          primeP,
          primeQ,
          dp: BigInt(`0x${material.dpHex}`),
          dq: BigInt(`0x${material.dqHex}`),
          qInv: BigInt(`0x${material.qInvHex}`),
        }
      : createRsaPrivateKey(modulus, publicExponent, privateExponent, primeP, primeQ);

  return {
    method: EncryptionMethod.RSA,
    version: 0,
    publicExponent: material.publicExponent,
    modulusHex: material.modulusHex,
    privateExponentHex: material.privateExponentHex,
    primePHex: material.primePHex,
    primeQHex: material.primeQHex,
    dpHex: bigintToEvenHex(privateKey.dp),
    dqHex: bigintToEvenHex(privateKey.dq),
    qInvHex: bigintToEvenHex(privateKey.qInv),
    publicKeyPem: material.publicKeyPem || encodeRsaPublicKeySpkiPem(modulus, publicExponent),
    privateKeyPem: material.privateKeyPem || encodeRsaPrivateKeyPkcs1Pem(privateKey),
  };
}

/**
 * Собирает материалы ключа «Кузнечик».
 * @param key 256-битный ключ.
 * @param initializationVector 128-битный IV.
 */
export function kuznyechikEncryptionKeyMaterial(key: Uint8Array, initializationVector: Uint8Array): KuznyechikEncryptionKeyMaterial {
  return {
    method: EncryptionMethod.KUZNYECHIK,
    keyHex: toHexString(key),
    ivHex: toHexString(initializationVector),
  };
}

/**
 * Извлекает IV из начала шифртекста «Кузнечик» (первые 16 байт в hex).
 * @param ciphertextHex Шифртекст в шестнадцатеричном виде.
 */
function kuznyechikIvFromCiphertextHex(ciphertextHex: string): Uint8Array {
  const compactHex = ciphertextHex.replace(/\s+/g, "");
  const ivHex = compactHex.slice(0, 32);
  if (ivHex.length !== 32) {
    return new Uint8Array(0);
  }
  const bytes = new Uint8Array(16);
  for (let index = 0; index < 16; index += 1) {
    bytes[index] = Number.parseInt(ivHex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Восстанавливает материалы ключа для старых записей без сохранённого JSON.
 * @param method Метод шифрования сообщения.
 * @param ciphertextHex Шифртекст (для IV «Кузнечика»).
 * @param rsaKeyPair Текущая системная пара RSA или `null`.
 * @param kuznyechikMasterKey Системный ключ «Кузнечик».
 */
export function fallbackKeyMaterialForMessage(
  method: EncryptionMethodName,
  ciphertextHex: string,
  rsaKeyPair: RsaKeyPair | null,
  kuznyechikMasterKey: Uint8Array,
): EncryptionKeyMaterial | null {
  if (method === EncryptionMethod.RSA) {
    return rsaKeyPair ? rsaEncryptionKeyMaterial(rsaKeyPair) : null;
  }
  return kuznyechikEncryptionKeyMaterial(kuznyechikMasterKey, kuznyechikIvFromCiphertextHex(ciphertextHex));
}

/**
 * Разбирает JSON материалов ключа из хранилища.
 * @param raw Строка JSON или пустое значение.
 * @returns Материалы или `null` при отсутствии/повреждении.
 */
export function parseEncryptionKeyMaterial(raw: string | null | undefined): EncryptionKeyMaterial | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<EncryptionKeyMaterial> & { method?: EncryptionMethodName };
    if (parsed.method === EncryptionMethod.RSA) {
      const material = parsed as Partial<RsaEncryptionKeyMaterial>;
      if (
        typeof material.publicExponent !== "string" ||
        typeof material.modulusHex !== "string" ||
        typeof material.privateExponentHex !== "string" ||
        typeof material.primePHex !== "string" ||
        typeof material.primeQHex !== "string"
      ) {
        return null;
      }
      return completeRsaKeyMaterial({
        publicExponent: material.publicExponent,
        modulusHex: material.modulusHex,
        privateExponentHex: material.privateExponentHex,
        primePHex: material.primePHex,
        primeQHex: material.primeQHex,
        dpHex: typeof material.dpHex === "string" ? material.dpHex : undefined,
        dqHex: typeof material.dqHex === "string" ? material.dqHex : undefined,
        qInvHex: typeof material.qInvHex === "string" ? material.qInvHex : undefined,
        publicKeyPem: typeof material.publicKeyPem === "string" ? material.publicKeyPem : "",
        privateKeyPem: typeof material.privateKeyPem === "string" ? material.privateKeyPem : "",
      });
    }
    if (parsed.method === EncryptionMethod.KUZNYECHIK) {
      const material = parsed as Partial<KuznyechikEncryptionKeyMaterial>;
      if (typeof material.keyHex !== "string" || typeof material.ivHex !== "string") {
        return null;
      }
      return {
        method: EncryptionMethod.KUZNYECHIK,
        keyHex: material.keyHex,
        ivHex: material.ivHex,
      };
    }
    return null;
  } catch {
    return null;
  }
}
