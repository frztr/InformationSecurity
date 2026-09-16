import type { PasswordResetTokenRepository } from "@/domain/identity/PasswordResetTokenRepository";
import { getPrismaClient } from "@/infrastructure/persistence/prisma/PrismaClientSingleton";

export class PrismaPasswordResetTokenRepository implements PasswordResetTokenRepository {
  public async create(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await getPrismaClient().passwordResetToken.create({
      data: { userId, tokenHash, expiresAt },
    });
  }

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
