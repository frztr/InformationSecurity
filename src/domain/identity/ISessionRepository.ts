/**
 * Запись сеанса аутентификации.
 */
export type SessionRecord = {
  id: string;
  userId: string;
  expiresAt: Date;
};

/**
 * Хранилище сеансов.
 */
export interface ISessionRepository {
  /**
   * Создаёт сеанс.
   * @param userId Идентификатор пользователя.
   * @param tokenHash Хэш токена сеанса.
   * @param expiresAt Срок действия.
   */
  create(userId: string, tokenHash: string, expiresAt: Date): Promise<SessionRecord>;
  /**
   * Ищет действующий сеанс по хэшу токена.
   * @param tokenHash Хэш токена.
   * @returns Сеанс или `null`.
   */
  findByTokenHash(tokenHash: string): Promise<SessionRecord | null>;
  /**
   * Удаляет сеанс по хэшу токена.
   * @param tokenHash Хэш токена.
   */
  deleteByTokenHash(tokenHash: string): Promise<void>;
}
