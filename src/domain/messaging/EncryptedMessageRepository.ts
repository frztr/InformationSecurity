import type { EncryptionMethod } from "@/domain/cryptography/EncryptionMethod";
import type { EncryptedMessageRecord } from "@/domain/messaging/EncryptedMessageRecord";
import type { EncryptionKeyMaterial } from "@/domain/messaging/EncryptionKeyMaterial";

export interface EncryptedMessageRepository {
  insert(
    userId: string,
    method: EncryptionMethod,
    plaintext: string,
    ciphertextHex: string,
    keyMaterial: EncryptionKeyMaterial,
  ): Promise<EncryptedMessageRecord>;
  listByUser(userId: string): Promise<EncryptedMessageRecord[]>;
  listAll(): Promise<EncryptedMessageRecord[]>;
  findById(messageId: string): Promise<EncryptedMessageRecord | null>;
}
