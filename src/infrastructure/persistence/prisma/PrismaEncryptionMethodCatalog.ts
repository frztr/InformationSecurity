import type { EncryptionMethod } from "@/domain/cryptography/EncryptionMethod";
import type { EncryptionMethodCatalog } from "@/domain/access/EncryptionMethodCatalog";
import { getPrismaClient } from "@/infrastructure/persistence/prisma/PrismaClientSingleton";

export class PrismaEncryptionMethodCatalog implements EncryptionMethodCatalog {
  public async isEnabled(method: EncryptionMethod): Promise<boolean> {
    const record = await getPrismaClient().encryptionMethodSetting.findUnique({ where: { method } });
    return record?.enabled ?? false;
  }

  public async list(): Promise<Array<{ method: EncryptionMethod; enabled: boolean }>> {
    const records = await getPrismaClient().encryptionMethodSetting.findMany({
      orderBy: { method: "asc" },
    });
    return records.map((record) => ({ method: record.method, enabled: record.enabled }));
  }

  public async setEnabled(method: EncryptionMethod, enabled: boolean): Promise<void> {
    await getPrismaClient().encryptionMethodSetting.upsert({
      where: { method },
      update: { enabled },
      create: { method, enabled },
    });
  }
}
