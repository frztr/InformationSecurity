import type { EmailOtpPurpose, EmailOtpRecord, EmailOtpRepository } from "@/domain/identity/EmailOtpRepository";
import { getPrismaClient } from "@/infrastructure/persistence/prisma/PrismaClientSingleton";

export class PrismaEmailOtpRepository implements EmailOtpRepository {
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
