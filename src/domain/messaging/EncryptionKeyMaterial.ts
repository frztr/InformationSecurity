import { EncryptionMethod, type EncryptionMethod as EncryptionMethodName } from "@/domain/cryptography/EncryptionMethod";
import { toHexString } from "@/domain/cryptography/HexEncoding";
import { encodeRsaPrivateKeyPkcs1Pem, encodeRsaPublicKeySpkiPem } from "@/domain/cryptography/rsa/RsaPemEncoding";
import type { RsaKeyPair } from "@/domain/cryptography/rsa/RsaKeyPair";

export type RsaEncryptionKeyMaterial = {
  method: "RSA";
  modulusBitLength: number;
  publicExponent: string;
  modulusHex: string;
  privateExponentHex: string;
  primePHex: string;
  primeQHex: string;
  publicKeyPem: string;
  privateKeyPem: string;
};

export type KuznyechikEncryptionKeyMaterial = {
  method: "KUZNYECHIK";
  keyHex: string;
  ivHex: string;
};

export type EncryptionKeyMaterial = RsaEncryptionKeyMaterial | KuznyechikEncryptionKeyMaterial;

export function bigintToEvenHex(value: bigint): string {
  const hex = value.toString(16);
  return hex.length % 2 === 0 ? hex : `0${hex}`;
}

export function rsaEncryptionKeyMaterial(keyPair: RsaKeyPair): RsaEncryptionKeyMaterial {
  return completeRsaKeyMaterial({
    method: EncryptionMethod.RSA,
    modulusBitLength: keyPair.publicKey.modulusBitLength,
    publicExponent: keyPair.publicKey.publicExponent.toString(),
    modulusHex: bigintToEvenHex(keyPair.publicKey.modulus),
    privateExponentHex: bigintToEvenHex(keyPair.privateKey.privateExponent),
    primePHex: bigintToEvenHex(keyPair.privateKey.primeP),
    primeQHex: bigintToEvenHex(keyPair.privateKey.primeQ),
    publicKeyPem: "",
    privateKeyPem: "",
  });
}

export function completeRsaKeyMaterial(material: RsaEncryptionKeyMaterial): RsaEncryptionKeyMaterial {
  const modulus = BigInt(`0x${material.modulusHex}`);
  const publicExponent = BigInt(material.publicExponent);
  const privateExponent = BigInt(`0x${material.privateExponentHex}`);
  const primeP = BigInt(`0x${material.primePHex}`);
  const primeQ = BigInt(`0x${material.primeQHex}`);
  return {
    ...material,
    publicKeyPem: material.publicKeyPem || encodeRsaPublicKeySpkiPem(modulus, publicExponent),
    privateKeyPem: material.privateKeyPem || encodeRsaPrivateKeyPkcs1Pem(modulus, publicExponent, privateExponent, primeP, primeQ),
  };
}

export function kuznyechikEncryptionKeyMaterial(key: Uint8Array, initializationVector: Uint8Array): KuznyechikEncryptionKeyMaterial {
  return {
    method: EncryptionMethod.KUZNYECHIK,
    keyHex: toHexString(key),
    ivHex: toHexString(initializationVector),
  };
}

export function kuznyechikIvFromCiphertextHex(ciphertextHex: string): Uint8Array {
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

export function parseEncryptionKeyMaterial(raw: string | null | undefined): EncryptionKeyMaterial | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<EncryptionKeyMaterial> & { method?: EncryptionMethodName };
    if (parsed.method === EncryptionMethod.RSA) {
      const material = parsed as Partial<RsaEncryptionKeyMaterial>;
      if (
        typeof material.modulusBitLength !== "number" ||
        typeof material.publicExponent !== "string" ||
        typeof material.modulusHex !== "string" ||
        typeof material.privateExponentHex !== "string" ||
        typeof material.primePHex !== "string" ||
        typeof material.primeQHex !== "string"
      ) {
        return null;
      }
      return completeRsaKeyMaterial({
        method: EncryptionMethod.RSA,
        modulusBitLength: material.modulusBitLength,
        publicExponent: material.publicExponent,
        modulusHex: material.modulusHex,
        privateExponentHex: material.privateExponentHex,
        primePHex: material.primePHex,
        primeQHex: material.primeQHex,
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
