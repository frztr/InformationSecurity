import type { EncryptionMethod } from "@/domain/cryptography/EncryptionMethod";
import type { EncryptionKeyMaterial } from "@/domain/messaging/EncryptionKeyMaterial";

/**
 * Сохранённое сообщение: открытый текст, шифртекст и материалы ключа.
 */
export type EncryptedMessageRecord = {
  id: string;
  userId: string;
  userLogin: string;
  method: EncryptionMethod;
  plaintext: string;
  ciphertextHex: string;
  keyMaterial: EncryptionKeyMaterial | null;
  createdAt: Date;
};

/**
 * Преобразует запись в DTO журнала (дата в ISO-8601).
 * @param message Запись хранилища.
 */
export function toHistoryMessage(message: EncryptedMessageRecord) {
  return {
    id: message.id,
    userLogin: message.userLogin,
    method: message.method,
    plaintext: message.plaintext,
    ciphertextHex: message.ciphertextHex,
    keyMaterial: message.keyMaterial,
    createdAt: message.createdAt.toISOString(),
  };
}
