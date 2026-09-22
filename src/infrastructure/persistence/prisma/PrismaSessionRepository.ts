import type { SessionRecord, ISessionRepository } from "@/domain/identity/ISessionRepository";
import { getPrismaClient } from "@/infrastructure/persistence/prisma/PrismaClientSingleton";

/**
 * Реализация ISessionRepository на Prisma.
 */
export class PrismaSessionRepository implements ISessionRepository {
  /**
   * Создаёт сессию с хэшем токена и сроком действия.
   * @param userId Идентификатор пользователя.
   * @param tokenHash Хэш токена.
   * @param expiresAt Срок действия.
   * @returns Созданная запись без хэша токена.
   */
  public async create(userId: string, tokenHash: string, expiresAt: Date): Promise<SessionRecord> {
    const record = await getPrismaClient().authSession.create({
      data: { userId, tokenHash, expiresAt },
    });
    return { id: record.id, userId: record.userId, expiresAt: record.expiresAt };
  }

  /**
   * Ищет неистёкшую сессию по хэшу токена.
   * @param tokenHash Хэш токена.
   * @returns Запись или null, если нет или истекла.
   */
  public async findByTokenHash(tokenHash: string): Promise<SessionRecord | null> {
    const record = await getPrismaClient().authSession.findUnique({ where: { tokenHash } });
    if (!record || record.expiresAt <= new Date()) {
      return null;
    }
    return { id: record.id, userId: record.userId, expiresAt: record.expiresAt };
  }

  /**
   * Удаляет сессии с указанным хэшем токена.
   * @param tokenHash Хэш токена.
   * @returns Ничего.
   */
  public async deleteByTokenHash(tokenHash: string): Promise<void> {
    await getPrismaClient().authSession.deleteMany({ where: { tokenHash } });
  }
}
