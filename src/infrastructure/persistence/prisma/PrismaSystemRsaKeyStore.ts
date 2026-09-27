import { bitLengthOf } from "@/domain/cryptography/primes/BigIntegerArithmetic";
import type { RsaKeyPair } from "@/domain/cryptography/rsa/RsaKeyPair";
import { createRsaPrivateKey } from "@/domain/cryptography/rsa/RsaKeyPair";
import type { RsaKeyStatus, ISystemRsaKeyStore } from "@/domain/cryptography/rsa/ISystemRsaKeyStore";
import { getPrismaClient } from "@/infrastructure/persistence/prisma/PrismaClientSingleton";

/**
 * Реализация ISystemRsaKeyStore на Prisma (запись id = "system").
 */
export class PrismaSystemRsaKeyStore implements ISystemRsaKeyStore {
  /**
   * Возвращает статус системного ключа. При отсутствии записи — GENERATING и длина модуля 0.
   * @returns Статус и битовая длина модуля.
   */
  public async getStatus(): Promise<{ status: RsaKeyStatus; modulusBitLength: number }> {
    const record = await getPrismaClient().systemRsaKey.findUnique({ where: { id: "system" } });
    if (!record) {
      return { status: "GENERATING", modulusBitLength: 0 };
    }
    return { status: record.status, modulusBitLength: record.modulusBitLength };
  }

  /**
   * Возвращает пару RSA, если статус READY и все hex-поля заполнены.
   * @returns Пара ключей или null.
   */
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

    const modulus = BigInt(`0x${record.modulusHex}`);
    const publicExponent = BigInt(record.publicExponent);
    const publicKey = { modulus, publicExponent };
    const privateExponent = BigInt(`0x${record.privateExponentHex}`);
    const primeP = BigInt(`0x${record.primePHex}`);
    const primeQ = BigInt(`0x${record.primeQHex}`);
    const privateKey =
      record.dpHex && record.dqHex && record.qInvHex
        ? {
            version: 0 as const,
            modulus,
            publicExponent,
            privateExponent,
            primeP,
            primeQ,
            dp: BigInt(`0x${record.dpHex}`),
            dq: BigInt(`0x${record.dqHex}`),
            qInv: BigInt(`0x${record.qInvHex}`),
          }
        : createRsaPrivateKey(modulus, publicExponent, privateExponent, primeP, primeQ);

    return { publicKey, privateKey };
  }

  /**
   * Помечает системный ключ как генерируемый (upsert записи "system").
   * @param modulusBitLength Целевая длина модуля.
   * @returns Ничего.
   */
  public async markGenerating(modulusBitLength: number): Promise<void> {
    await getPrismaClient().systemRsaKey.upsert({
      where: { id: "system" },
      update: { status: "GENERATING", modulusBitLength },
      create: { id: "system", status: "GENERATING", modulusBitLength },
    });
  }

  /**
   * Сохраняет готовую пару RSA и ставит статус READY.
   * @param keyPair Пара ключей.
   * @returns Ничего.
   */
  public async saveKeyPair(keyPair: RsaKeyPair): Promise<void> {
    const { publicKey, privateKey } = keyPair;
    const fields = {
      status: "READY" as const,
      version: privateKey.version,
      modulusBitLength: bitLengthOf(publicKey.modulus),
      modulusHex: publicKey.modulus.toString(16),
      publicExponent: publicKey.publicExponent.toString(),
      privateExponentHex: privateKey.privateExponent.toString(16),
      primePHex: privateKey.primeP.toString(16),
      primeQHex: privateKey.primeQ.toString(16),
      dpHex: privateKey.dp.toString(16),
      dqHex: privateKey.dq.toString(16),
      qInvHex: privateKey.qInv.toString(16),
    };
    await getPrismaClient().systemRsaKey.upsert({
      where: { id: "system" },
      update: fields,
      create: { id: "system", ...fields },
    });
  }
}
