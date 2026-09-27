import { bitLengthOf, modularInverse } from "@/domain/cryptography/primes/BigIntegerArithmetic";

/**
 * Открытый ключ RSA: модуль n и открытая экспонента e.
 */
export type RsaPublicKey = {
  modulus: bigint;
  publicExponent: bigint;
};

/**
 * Закрытый ключ RSA в форме PKCS#1 (двухпростая, version = 0).
 */
export type RsaPrivateKey = {
  /** 0 — только два простых множителя p и q. */
  version: 0;
  modulus: bigint;
  publicExponent: bigint;
  privateExponent: bigint;
  primeP: bigint;
  primeQ: bigint;
  /** d mod (p − 1). */
  dp: bigint;
  /** d mod (q − 1). */
  dq: bigint;
  /** q⁻¹ mod p. */
  qInv: bigint;
};

/** Пара открытого и закрытого ключей RSA. */
export type RsaKeyPair = {
  publicKey: RsaPublicKey;
  privateKey: RsaPrivateKey;
};

/**
 * Длина модуля RSA в байтах (для блоков PKCS#1).
 * @param modulus Модуль n.
 */
export function rsaModulusByteLength(modulus: bigint): number {
  return Math.ceil(bitLengthOf(modulus) / 8);
}

/**
 * Собирает закрытый ключ PKCS#1: CRT-параметры dp, dq, qInv считаются один раз.
 * @param modulus Модуль n = p·q.
 * @param publicExponent Открытая экспонента e.
 * @param privateExponent Закрытая экспонента d.
 * @param primeP Простое p.
 * @param primeQ Простое q.
 */
export function createRsaPrivateKey(
  modulus: bigint,
  publicExponent: bigint,
  privateExponent: bigint,
  primeP: bigint,
  primeQ: bigint,
): RsaPrivateKey {
  return {
    version: 0,
    modulus,
    publicExponent,
    privateExponent,
    primeP,
    primeQ,
    dp: privateExponent % (primeP - 1n),
    dq: privateExponent % (primeQ - 1n),
    qInv: modularInverse(primeQ, primeP),
  };
}
