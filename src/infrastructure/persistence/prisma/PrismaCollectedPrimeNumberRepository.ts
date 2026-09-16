import { createHash } from "node:crypto";
import type {
  CollectedPrimeNumber,
  CollectedPrimeNumberRepository,
} from "@/domain/cryptography/primes/CollectedPrimeNumberRepository";
import { getPrismaClient } from "@/infrastructure/persistence/prisma/PrismaClientSingleton";

function hashDecimalValue(decimalValue: string): string {
  return createHash("sha256").update(decimalValue, "utf8").digest("hex");
}

export class PrismaCollectedPrimeNumberRepository implements CollectedPrimeNumberRepository {
  public async addIfAbsent(decimalValue: string, bitLength: number): Promise<void> {
    const valueHash = hashDecimalValue(decimalValue);
    await getPrismaClient().collectedRsaPrime.upsert({
      where: { valueHash },
      update: {},
      create: { valueHash, decimalValue, bitLength },
    });
  }

  public async listByBitLength(bitLength: number): Promise<CollectedPrimeNumber[]> {
    const records = await getPrismaClient().collectedRsaPrime.findMany({
      where: { bitLength },
      orderBy: { createdAt: "asc" },
    });
    return records.map((record) => ({
      decimalValue: record.decimalValue,
      bitLength: record.bitLength,
    }));
  }

  public async countByBitLength(bitLength: number): Promise<number> {
    return getPrismaClient().collectedRsaPrime.count({ where: { bitLength } });
  }
}
