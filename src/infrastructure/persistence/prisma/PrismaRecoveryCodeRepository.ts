import type { RecoveryCodeRepository } from "@/domain/identity/RecoveryCodeRepository";
import { getPrismaClient } from "@/infrastructure/persistence/prisma/PrismaClientSingleton";

export class PrismaRecoveryCodeRepository implements RecoveryCodeRepository {
  public async replaceAll(userId: string, codeHashes: string[]): Promise<void> {
    const prisma = getPrismaClient();
    await prisma.$transaction([
      prisma.recoveryCode.deleteMany({ where: { userId } }),
      prisma.recoveryCode.createMany({
        data: codeHashes.map((codeHash) => ({ userId, codeHash })),
      }),
    ]);
  }

  public async consumeUnused(userId: string, codeHash: string): Promise<boolean> {
    const result = await getPrismaClient().recoveryCode.updateMany({
      where: { userId, codeHash, usedAt: null },
      data: { usedAt: new Date() },
    });
    return result.count === 1;
  }
}
