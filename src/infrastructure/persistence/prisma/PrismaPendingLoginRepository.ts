import type { PendingLoginRepository, PendingLoginState } from "@/domain/identity/PendingLoginRepository";
import { getPrismaClient } from "@/infrastructure/persistence/prisma/PrismaClientSingleton";

export class PrismaPendingLoginRepository implements PendingLoginRepository {
  public async create(userId: string, expiresAt: Date): Promise<PendingLoginState> {
    const record = await getPrismaClient().pendingLogin.create({
      data: { userId, expiresAt },
    });
    return this.map(record);
  }

  public async findById(pendingLoginId: string): Promise<PendingLoginState | null> {
    const record = await getPrismaClient().pendingLogin.findUnique({ where: { id: pendingLoginId } });
    return record ? this.map(record) : null;
  }

  public async markEmailVerified(pendingLoginId: string): Promise<void> {
    await getPrismaClient().pendingLogin.update({
      where: { id: pendingLoginId },
      data: { emailVerified: true },
    });
  }

  public async delete(pendingLoginId: string): Promise<void> {
    await getPrismaClient().pendingLogin.delete({ where: { id: pendingLoginId } });
  }

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
