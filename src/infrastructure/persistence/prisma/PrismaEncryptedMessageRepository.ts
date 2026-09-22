import type { EncryptionMethod } from "@/domain/cryptography/EncryptionMethod";
import type { EncryptedMessageRecord } from "@/domain/messaging/EncryptedMessageRecord";
import type { IEncryptedMessageRepository } from "@/domain/messaging/IEncryptedMessageRepository";
import type { EncryptionKeyMaterial } from "@/domain/messaging/EncryptionKeyMaterial";
import { parseEncryptionKeyMaterial } from "@/domain/messaging/EncryptionKeyMaterial";
import { getPrismaClient } from "@/infrastructure/persistence/prisma/PrismaClientSingleton";

/**
 * Реализация IEncryptedMessageRepository на Prisma.
 */
export class PrismaEncryptedMessageRepository implements IEncryptedMessageRepository {
  /**
   * Сохраняет зашифрованное сообщение и связанный ключевой материал.
   * @param userId Идентификатор автора.
   * @param method Метод шифрования.
   * @param plaintext Открытый текст.
   * @param ciphertextHex Шифртекст в hex.
   * @param keyMaterial Ключевой материал.
   * @returns Созданная запись с логином автора.
   */
  public async insert(
    userId: string,
    method: EncryptionMethod,
    plaintext: string,
    ciphertextHex: string,
    keyMaterial: EncryptionKeyMaterial,
  ): Promise<EncryptedMessageRecord> {
    const record = await getPrismaClient().encryptedMessage.create({
      data: {
        userId,
        method,
        plaintext,
        ciphertextHex,
        keyMaterialJson: JSON.stringify(keyMaterial),
      },
      include: { user: true },
    });
    return this.map(record);
  }

  /**
   * Возвращает сообщения пользователя по убыванию createdAt.
   * @param userId Идентификатор автора.
   * @returns Список записей.
   */
  public async listByUser(userId: string): Promise<EncryptedMessageRecord[]> {
    const records = await getPrismaClient().encryptedMessage.findMany({
      where: { userId },
      include: { user: true },
      orderBy: { createdAt: "desc" },
    });
    return records.map((record) => this.map(record));
  }

  /**
   * Возвращает все сообщения по убыванию createdAt.
   * @returns Список записей.
   */
  public async listAll(): Promise<EncryptedMessageRecord[]> {
    const records = await getPrismaClient().encryptedMessage.findMany({
      include: { user: true },
      orderBy: { createdAt: "desc" },
    });
    return records.map((record) => this.map(record));
  }

  /**
   * Ищет сообщение по идентификатору.
   * @param messageId Идентификатор сообщения.
   * @returns Запись или null.
   */
  public async findById(messageId: string): Promise<EncryptedMessageRecord | null> {
    const record = await getPrismaClient().encryptedMessage.findUnique({
      where: { id: messageId },
      include: { user: true },
    });
    return record ? this.map(record) : null;
  }

  /** Преобразует строку Prisma в EncryptedMessageRecord. */
  private map(record: {
    id: string;
    userId: string;
    method: EncryptionMethod;
    plaintext: string;
    ciphertextHex: string;
    keyMaterialJson: string | null;
    createdAt: Date;
    user: { login: string };
  }): EncryptedMessageRecord {
    return {
      id: record.id,
      userId: record.userId,
      userLogin: record.user.login,
      method: record.method,
      plaintext: record.plaintext,
      ciphertextHex: record.ciphertextHex,
      keyMaterial: parseEncryptionKeyMaterial(record.keyMaterialJson),
      createdAt: record.createdAt,
    };
  }
}
