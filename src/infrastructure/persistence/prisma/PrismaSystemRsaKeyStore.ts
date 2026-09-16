import type { RsaKeyPair } from "@/domain/cryptography/rsa/RsaKeyPair";
import type { RsaKeyStatus, SystemRsaKeyStore } from "@/domain/cryptography/rsa/SystemRsaKeyStore";
import { getPrismaClient } from "@/infrastructure/persistence/prisma/PrismaClientSingleton";

export class PrismaSystemRsaKeyStore implements SystemRsaKeyStore {
  public async getStatus(): Promise<{ status: RsaKeyStatus; modulusBitLength: number }> {
    const record = await getPrismaClient().systemRsaKey.findUnique({ where: { id: "system" } });
    if (!record) {
      return { status: "GENERATING", modulusBitLength: 0 };
    }
    return { status: record.status, modulusBitLength: record.modulusBitLength };
  }

  public async tryGetKeyPair(): Promise<RsaKeyPair | null> {
    const record = await getPrismaClient().systemRsaKey.findUnique({ where: { id: "system" } });
    if (
      !record ||
      record.status !== "READY" ||
      !record.modulusHex ||
      !record.publicExponent ||
      !record.privateExponentHex ||
      !record.primePHex ||
      !record.primeQHex
    ) {
      return null;
    }

    const publicKey = {
      modulus: BigInt(`0x${record.modulusHex}`),
      publicExponent: BigInt(record.publicExponent),
      modulusBitLength: record.modulusBitLength,
    };

    return {
      publicKey,
      privateKey: {
        ...publicKey,
        privateExponent: BigInt(`0x${record.privateExponentHex}`),
        primeP: BigInt(`0x${record.primePHex}`),
        primeQ: BigInt(`0x${record.primeQHex}`),
      },
    };
  }

  public async markGenerating(modulusBitLength: number): Promise<void> {
    await getPrismaClient().systemRsaKey.upsert({
      where: { id: "system" },
      update: { status: "GENERATING", modulusBitLength },
      create: { id: "system", status: "GENERATING", modulusBitLength },
    });
  }

  public async saveKeyPair(keyPair: RsaKeyPair): Promise<void> {
    await getPrismaClient().systemRsaKey.upsert({
      where: { id: "system" },
      update: {
        status: "READY",
        modulusBitLength: keyPair.publicKey.modulusBitLength,
        modulusHex: keyPair.publicKey.modulus.toString(16),
        publicExponent: keyPair.publicKey.publicExponent.toString(),
        privateExponentHex: keyPair.privateKey.privateExponent.toString(16),
        primePHex: keyPair.privateKey.primeP.toString(16),
        primeQHex: keyPair.privateKey.primeQ.toString(16),
      },
      create: {
        id: "system",
        status: "READY",
        modulusBitLength: keyPair.publicKey.modulusBitLength,
        modulusHex: keyPair.publicKey.modulus.toString(16),
        publicExponent: keyPair.publicKey.publicExponent.toString(),
        privateExponentHex: keyPair.privateKey.privateExponent.toString(16),
        primePHex: keyPair.privateKey.primeP.toString(16),
        primeQHex: keyPair.privateKey.primeQ.toString(16),
      },
    });
  }
}
