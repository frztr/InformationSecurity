import type { SessionRecord, SessionRepository } from "@/domain/identity/SessionRepository";
import { getPrismaClient } from "@/infrastructure/persistence/prisma/PrismaClientSingleton";

export class PrismaSessionRepository implements SessionRepository {
  public async create(userId: string, tokenHash: string, expiresAt: Date): Promise<SessionRecord> {
    const record = await getPrismaClient().authSession.create({
      data: { userId, tokenHash, expiresAt },
    });
    return { id: record.id, userId: record.userId, expiresAt: record.expiresAt };
  }

  public async findByTokenHash(tokenHash: string): Promise<SessionRecord | null> {
    const record = await getPrismaClient().authSession.findUnique({ where: { tokenHash } });
    if (!record || record.expiresAt <= new Date()) {
      return null;
    }
    return { id: record.id, userId: record.userId, expiresAt: record.expiresAt };
  }

  public async deleteByTokenHash(tokenHash: string): Promise<void> {
    await getPrismaClient().authSession.deleteMany({ where: { tokenHash } });
  }
}
