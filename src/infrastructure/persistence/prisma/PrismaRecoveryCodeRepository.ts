import type { IRecoveryCodeRepository } from "@/domain/identity/IRecoveryCodeRepository";
import { getPrismaClient } from "@/infrastructure/persistence/prisma/PrismaClientSingleton";

/**
 * Реализация IRecoveryCodeRepository на Prisma.
 */
export class PrismaRecoveryCodeRepository implements IRecoveryCodeRepository {
  /**
   * Заменяет все коды восстановления пользователя в одной транзакции.
   * @param userId Идентификатор пользователя.
   * @param codeHashes Хэши новых кодов.
   * @returns Ничего.
   */
  public async replaceAll(userId: string, codeHashes: string[]): Promise<void> {
    const prisma = getPrismaClient();
    await prisma.$transaction([
      prisma.recoveryCode.deleteMany({ where: { userId } }),
      prisma.recoveryCode.createMany({
        data: codeHashes.map((codeHash) => ({ userId, codeHash })),
      }),
    ]);
  }

  /**
   * Помечает неиспользованный код как использованный.
   * @param userId Идентификатор пользователя.
   * @param codeHash Хэш кода.
   * @returns true, если обновлена ровно одна строка.
   */
  public async consumeUnused(userId: string, codeHash: string): Promise<boolean> {
    const result = await getPrismaClient().recoveryCode.updateMany({
      where: { userId, codeHash, usedAt: null },
      data: { usedAt: new Date() },
    });
    return result.count === 1;
  }
}
