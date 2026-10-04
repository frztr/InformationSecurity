import { EncryptionMethod, type EncryptionMethod as EncryptionMethodName } from "@/domain/cryptography/EncryptionMethod";
import { toHexString } from "@/domain/cryptography/HexEncoding";
import { bitLengthOf } from "@/domain/cryptography/primes/BigIntegerArithmetic";
import { encodeRsaPrivateKeyPkcs1Pem, encodeRsaPublicKeySpkiPem } from "@/domain/cryptography/rsa/RsaPemEncoding";
import type { RsaKeyPair } from "@/domain/cryptography/rsa/RsaKeyPair";

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
 * Собирает материалы ключа из пары RSA.
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
 * Восстанавливает пару RSA из сохранённых материалов сообщения.
 * @param material Материалы RSA.
 */
export function rsaKeyPairFromMaterial(material: RsaEncryptionKeyMaterial): RsaKeyPair {
  const modulus = BigInt(`0x${material.modulusHex}`);
  const publicExponent = BigInt(material.publicExponent);
  return {
    publicKey: { modulus, publicExponent },
    privateKey: {
      version: 0,
      modulus,
      publicExponent,
      privateExponent: BigInt(`0x${material.privateExponentHex}`),
      primeP: BigInt(`0x${material.primePHex}`),
      primeQ: BigInt(`0x${material.primeQHex}`),
      dp: BigInt(`0x${material.dpHex}`),
      dq: BigInt(`0x${material.dqHex}`),
      qInv: BigInt(`0x${material.qInvHex}`),
    },
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
        typeof material.primeQHex !== "string" ||
        typeof material.dpHex !== "string" ||
        typeof material.dqHex !== "string" ||
        typeof material.qInvHex !== "string" ||
        typeof material.publicKeyPem !== "string" ||
        typeof material.privateKeyPem !== "string"
      ) {
        return null;
      }
      return {
        method: EncryptionMethod.RSA,
        version: 0,
        publicExponent: material.publicExponent,
        modulusHex: material.modulusHex,
        privateExponentHex: material.privateExponentHex,
        primePHex: material.primePHex,
        primeQHex: material.primeQHex,
        dpHex: material.dpHex,
        dqHex: material.dqHex,
        qInvHex: material.qInvHex,
        publicKeyPem: material.publicKeyPem,
        privateKeyPem: material.privateKeyPem,
      };
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
