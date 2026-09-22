import type { EncryptionMethod } from "@/domain/cryptography/EncryptionMethod";

/**
 * Хранилище признаков включения методов шифрования.
 */
export interface IEncryptionMethodRepository {
  /**
   * Проверяет, разрешён ли метод.
   * @param method Метод шифрования.
   */
  isEnabled(method: EncryptionMethod): Promise<boolean>;
  /**
   * Возвращает список методов и их состояние.
   */
  list(): Promise<Array<{ method: EncryptionMethod; enabled: boolean }>>;
  /**
   * Включает или отключает метод.
   * @param method Метод шифрования.
   * @param enabled Признак включения.
   */
  setEnabled(method: EncryptionMethod, enabled: boolean): Promise<void>;
}
