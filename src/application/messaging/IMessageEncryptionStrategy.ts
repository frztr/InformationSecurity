import type { Result } from "@/domain/Result";
import type { EncryptionKeyMaterial } from "@/domain/messaging/EncryptionKeyMaterial";

/**
 * Шифртекст и материалы ключа, полученные стратегией шифрования.
 */
export type EncryptedPayload = {
  ciphertextHex: string;
  keyMaterial: EncryptionKeyMaterial;
};

/**
 * Стратегия шифрования и расшифрования сообщения.
 */
export interface IMessageEncryptionStrategy {
  /**
   * Шифрует открытый текст.
   * @param plaintextBytes Байты открытого текста.
   */
  encrypt(plaintextBytes: Uint8Array): Promise<Result<EncryptedPayload>>;
  /**
   * Расшифровывает шифртекст ключом, сохранённым вместе с сообщением.
   * @param ciphertextHex Шифртекст в шестнадцатеричном виде.
   * @param keyMaterial Материалы ключа этого сообщения.
   */
  decrypt(ciphertextHex: string, keyMaterial: EncryptionKeyMaterial): Promise<Result<Uint8Array>>;
}
