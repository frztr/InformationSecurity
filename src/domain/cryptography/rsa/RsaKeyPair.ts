/**
 * Открытый ключ RSA.
 */
export type RsaPublicKey = {
  /** Модуль n = p·q. */
  modulus: bigint;
  /** Открытая экспонента e. */
  publicExponent: bigint;
  /** Длина модуля в битах. */
  modulusBitLength: number;
};

/**
 * Закрытый ключ RSA, включая множители модуля.
 */
export type RsaPrivateKey = RsaPublicKey & {
  /** Закрытая экспонента d. */
  privateExponent: bigint;
  /** Простой множитель p. */
  primeP: bigint;
  /** Простой множитель q. */
  primeQ: bigint;
};

/** Пара открытого и закрытого ключей RSA. */
export type RsaKeyPair = {
  publicKey: RsaPublicKey;
  privateKey: RsaPrivateKey;
};
