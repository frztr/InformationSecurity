import { Streebog512Hasher } from "@/domain/cryptography/gost/Streebog512Hasher";
import type {
  CollectedPrimeNumber,
  ICollectedPrimeNumberRepository,
} from "@/domain/cryptography/primes/ICollectedPrimeNumberRepository";
import { getPrismaClient } from "@/infrastructure/persistence/prisma/PrismaClientSingleton";

const streebog = new Streebog512Hasher();

function hashDecimalValue(decimalValue: string): string {
  return streebog.hashUtf8ToHex(decimalValue);
}

/**
 * Реализация ICollectedPrimeNumberRepository на Prisma.
 */
export class PrismaCollectedPrimeNumberRepository implements ICollectedPrimeNumberRepository {
  /**
   * Добавляет простое число, если хэш десятичной записи ещё не сохранён.
   * @param decimalValue Десятичная запись простого.
   * @param bitLength Длина в битах.
   * @returns Ничего.
   */
  public async addIfAbsent(decimalValue: string, bitLength: number): Promise<void> {
    const valueHash = hashDecimalValue(decimalValue);
    await getPrismaClient().collectedRsaPrime.upsert({
      where: { valueHash },
      update: {},
      create: { valueHash, decimalValue, bitLength },
    });
  }

  /**
   * Возвращает простые заданной битовой длины по возрастанию createdAt.
   * @param bitLength Длина в битах.
   * @returns Собранные простые.
   */
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

  /**
   * Считает простые заданной битовой длины.
   * @param bitLength Длина в битах.
   * @returns Число записей.
   */
  public async countByBitLength(bitLength: number): Promise<number> {
    return getPrismaClient().collectedRsaPrime.count({ where: { bitLength } });
  }
}
