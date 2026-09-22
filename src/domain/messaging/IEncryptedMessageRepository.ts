import type { EncryptionMethod } from "@/domain/cryptography/EncryptionMethod";
import type { EncryptedMessageRecord } from "@/domain/messaging/EncryptedMessageRecord";
import type { EncryptionKeyMaterial } from "@/domain/messaging/EncryptionKeyMaterial";

/**
 * Хранилище зашифрованных сообщений.
 */
export interface IEncryptedMessageRepository {
  /**
   * Сохраняет сообщение.
   * @param userId Автор.
   * @param method Метод шифрования.
   * @param plaintext Открытый текст.
   * @param ciphertextHex Шифртекст в шестнадцатеричном виде.
   * @param keyMaterial Материалы ключа, использованные при шифровании.
   */
  insert(
    userId: string,
    method: EncryptionMethod,
    plaintext: string,
    ciphertextHex: string,
    keyMaterial: EncryptionKeyMaterial,
  ): Promise<EncryptedMessageRecord>;
  /**
   * Возвращает сообщения пользователя.
   * @param userId Идентификатор автора.
   */
  listByUser(userId: string): Promise<EncryptedMessageRecord[]>;
  /**
   * Возвращает все сообщения.
   */
  listAll(): Promise<EncryptedMessageRecord[]>;
  /**
   * Ищет сообщение по идентификатору.
   * @param messageId Идентификатор сообщения.
   * @returns Запись или `null`.
   */
  findById(messageId: string): Promise<EncryptedMessageRecord | null>;
}
