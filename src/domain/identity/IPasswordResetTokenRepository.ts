/**
 * Хранилище токенов сброса пароля.
 */
export interface IPasswordResetTokenRepository {
  /**
   * Сохраняет хэш токена сброса.
   * @param userId Идентификатор пользователя.
   * @param tokenHash Хэш токена.
   * @param expiresAt Срок действия.
   */
  create(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  /**
   * Поглощает неиспользованный действующий токен.
   * @param tokenHash Хэш предъявленного токена.
   * @param now Текущий момент времени.
   * @returns Идентификатор пользователя или `null`.
   */
  consumeUnused(tokenHash: string, now: Date): Promise<string | null>;
}
