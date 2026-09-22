import type { IPendingLoginRepository, PendingLoginState } from "@/domain/identity/IPendingLoginRepository";
import { getPrismaClient } from "@/infrastructure/persistence/prisma/PrismaClientSingleton";

/**
 * Реализация IPendingLoginRepository на Prisma.
 */
export class PrismaPendingLoginRepository implements IPendingLoginRepository {
  /**
   * Создаёт незавершённый вход.
   * @param userId Идентификатор пользователя.
   * @param expiresAt Срок действия.
   * @returns Состояние незавершённого входа.
   */
  public async create(userId: string, expiresAt: Date): Promise<PendingLoginState> {
    const record = await getPrismaClient().pendingLogin.create({
      data: { userId, expiresAt },
    });
    return this.map(record);
  }

  /**
   * Ищет незавершённый вход по идентификатору.
   * @param pendingLoginId Идентификатор записи.
   * @returns Состояние или null.
   */
  public async findById(pendingLoginId: string): Promise<PendingLoginState | null> {
    const record = await getPrismaClient().pendingLogin.findUnique({ where: { id: pendingLoginId } });
    return record ? this.map(record) : null;
  }

  /**
   * Помечает, что email-фактор подтверждён.
   * @param pendingLoginId Идентификатор записи.
   * @returns Ничего.
   */
  public async markEmailVerified(pendingLoginId: string): Promise<void> {
    await getPrismaClient().pendingLogin.update({
      where: { id: pendingLoginId },
      data: { emailVerified: true },
    });
  }

  /**
   * Удаляет незавершённый вход.
   * @param pendingLoginId Идентификатор записи.
   * @returns Ничего.
   */
  public async delete(pendingLoginId: string): Promise<void> {
    await getPrismaClient().pendingLogin.delete({ where: { id: pendingLoginId } });
  }

  /** Возвращает запись Prisma как PendingLoginState. */
  private map(record: {
    id: string;
    userId: string;
    passwordVerified: boolean;
    emailVerified: boolean;
    expiresAt: Date;
  }): PendingLoginState {
    return record;
  }
}
