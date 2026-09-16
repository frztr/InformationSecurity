export type RsaPublicKey = {
  modulus: bigint;
  publicExponent: bigint;
  modulusBitLength: number;
};

export type RsaPrivateKey = RsaPublicKey & {
  privateExponent: bigint;
  primeP: bigint;
  primeQ: bigint;
};

export type RsaKeyPair = {
  publicKey: RsaPublicKey;
  privateKey: RsaPrivateKey;
};
