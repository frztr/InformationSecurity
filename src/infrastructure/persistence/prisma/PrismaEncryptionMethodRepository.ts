import type { EncryptionMethod } from "@/domain/cryptography/EncryptionMethod";
import type { IEncryptionMethodRepository } from "@/domain/access/IEncryptionMethodRepository";
import { getPrismaClient } from "@/infrastructure/persistence/prisma/PrismaClientSingleton";

/**
 * Реализация IEncryptionMethodRepository на Prisma.
 */
export class PrismaEncryptionMethodRepository implements IEncryptionMethodRepository {
  /**
   * Возвращает, включён ли метод. Отсутствующая запись считается выключенной.
   * @param method Метод шифрования.
   * @returns true, если запись есть и enabled.
   */
  public async isEnabled(method: EncryptionMethod): Promise<boolean> {
    const record = await getPrismaClient().encryptionMethodSetting.findUnique({ where: { method } });
    return record?.enabled ?? false;
  }

  /**
   * Возвращает все настройки методов по возрастанию имени.
   * @returns Список пар метод/включён.
   */
  public async list(): Promise<Array<{ method: EncryptionMethod; enabled: boolean }>> {
    const records = await getPrismaClient().encryptionMethodSetting.findMany({
      orderBy: { method: "asc" },
    });
    return records.map((record) => ({ method: record.method, enabled: record.enabled }));
  }

  /**
   * Создаёт или обновляет флаг включения метода.
   * @param method Метод шифрования.
   * @param enabled Новое значение.
   * @returns Ничего.
   */
  public async setEnabled(method: EncryptionMethod, enabled: boolean): Promise<void> {
    await getPrismaClient().encryptionMethodSetting.upsert({
      where: { method },
      update: { enabled },
      create: { method, enabled },
    });
  }
}
