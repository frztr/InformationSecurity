import type { PasswordHash } from "@/domain/identity/PasswordHash";

/**
 * Хэширование и проверка пароля.
 */
export interface IPasswordHasher {
  /**
   * Строит хэш пароля с новой солью.
   * @param password Открытый пароль.
   */
  hash(password: string): Promise<PasswordHash>;
  /**
   * Сверяет пароль с хранимым хэшем.
   * @param password Открытый пароль.
   * @param storedHash Хранимый хэш.
   * @returns `true`, если пароль совпадает.
   */
  verify(password: string, storedHash: PasswordHash): Promise<boolean>;
}
