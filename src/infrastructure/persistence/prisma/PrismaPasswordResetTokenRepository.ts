import type { IPasswordResetTokenRepository } from "@/domain/identity/IPasswordResetTokenRepository";
import { getPrismaClient } from "@/infrastructure/persistence/prisma/PrismaClientSingleton";

/**
 * Реализация IPasswordResetTokenRepository на Prisma.
 */
export class PrismaPasswordResetTokenRepository implements IPasswordResetTokenRepository {
  /**
   * Сохраняет токен сброса пароля.
   * @param userId Идентификатор пользователя.
   * @param tokenHash Хэш токена.
   * @param expiresAt Срок действия.
   * @returns Ничего.
   */
  public async create(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await getPrismaClient().passwordResetToken.create({
      data: { userId, tokenHash, expiresAt },
    });
  }

  /**
   * Находит неиспользованный неистёкший токен, помечает его использованным и возвращает userId.
   * @param tokenHash Хэш токена.
   * @param now Текущий момент.
   * @returns Идентификатор пользователя или null.
   */
  public async consumeUnused(tokenHash: string, now: Date): Promise<string | null> {
    const record = await getPrismaClient().passwordResetToken.findFirst({
      where: { tokenHash, consumedAt: null, expiresAt: { gt: now } },
    });
    if (!record) {
      return null;
    }
    await getPrismaClient().passwordResetToken.update({
      where: { id: record.id },
      data: { consumedAt: now },
    });
    return record.userId;
  }
}
