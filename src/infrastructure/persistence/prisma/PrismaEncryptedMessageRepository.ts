import type { EncryptionMethod } from "@/domain/cryptography/EncryptionMethod";
import type { EncryptedMessageRecord } from "@/domain/messaging/EncryptedMessageRecord";
import type { EncryptedMessageRepository } from "@/domain/messaging/EncryptedMessageRepository";
import type { EncryptionKeyMaterial } from "@/domain/messaging/EncryptionKeyMaterial";
import { parseEncryptionKeyMaterial } from "@/domain/messaging/EncryptionKeyMaterial";
import { getPrismaClient } from "@/infrastructure/persistence/prisma/PrismaClientSingleton";

export class PrismaEncryptedMessageRepository implements EncryptedMessageRepository {
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

  public async listByUser(userId: string): Promise<EncryptedMessageRecord[]> {
    const records = await getPrismaClient().encryptedMessage.findMany({
      where: { userId },
      include: { user: true },
      orderBy: { createdAt: "desc" },
    });
    return records.map((record) => this.map(record));
  }

  public async listAll(): Promise<EncryptedMessageRecord[]> {
    const records = await getPrismaClient().encryptedMessage.findMany({
      include: { user: true },
      orderBy: { createdAt: "desc" },
    });
    return records.map((record) => this.map(record));
  }

  public async findById(messageId: string): Promise<EncryptedMessageRecord | null> {
    const record = await getPrismaClient().encryptedMessage.findUnique({
      where: { id: messageId },
      include: { user: true },
    });
    return record ? this.map(record) : null;
  }

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
