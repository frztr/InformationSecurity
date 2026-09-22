import type { EmailOtpPurpose, EmailOtpRecord, IEmailOtpRepository } from "@/domain/identity/IEmailOtpRepository";
import { getPrismaClient } from "@/infrastructure/persistence/prisma/PrismaClientSingleton";

/**
 * Реализация IEmailOtpRepository на Prisma.
 */
export class PrismaEmailOtpRepository implements IEmailOtpRepository {
  /**
   * Сохраняет OTP с хэшем кода и сроком действия.
   * @param userId Идентификатор пользователя.
   * @param purpose Назначение кода.
   * @param codeHash Хэш кода.
   * @param expiresAt Срок действия.
   * @returns Созданная запись без хэша кода.
   */
  public async create(
    userId: string,
    purpose: EmailOtpPurpose,
    codeHash: string,
    expiresAt: Date,
  ): Promise<EmailOtpRecord> {
    const record = await getPrismaClient().emailOtp.create({
      data: { userId, purpose, codeHash, expiresAt },
    });
    return { id: record.id, userId: record.userId, purpose: record.purpose, expiresAt: record.expiresAt };
  }

  /**
   * Помечает неиспользованный неистёкший OTP как использованный.
   * @param userId Идентификатор пользователя.
   * @param purpose Назначение кода.
   * @param codeHash Хэш предъявленного кода.
   * @param now Текущий момент.
   * @returns true, если обновлена хотя бы одна строка.
   */
  public async consumeUnused(
    userId: string,
    purpose: EmailOtpPurpose,
    codeHash: string,
    now: Date,
  ): Promise<boolean> {
    const result = await getPrismaClient().emailOtp.updateMany({
      where: {
        userId,
        purpose,
        codeHash,
        consumedAt: null,
        expiresAt: { gt: now },
      },
      data: { consumedAt: now },
    });
    return result.count >= 1;
  }
}
