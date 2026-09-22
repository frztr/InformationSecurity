/**
 * Состояние незавершённого входа (пароль и почтовый код).
 */
export type PendingLoginState = {
  id: string;
  userId: string;
  passwordVerified: boolean;
  emailVerified: boolean;
  expiresAt: Date;
};

/**
 * Хранилище незавершённых входов.
 */
export interface IPendingLoginRepository {
  /**
   * Создаёт запись после успешной проверки пароля.
   * @param userId Идентификатор пользователя.
   * @param expiresAt Срок действия.
   */
  create(userId: string, expiresAt: Date): Promise<PendingLoginState>;
  /**
   * Ищет незавершённый вход по идентификатору.
   * @param pendingLoginId Идентификатор записи.
   * @returns Состояние или `null`.
   */
  findById(pendingLoginId: string): Promise<PendingLoginState | null>;
  /**
   * Отмечает успешную проверку кода из письма.
   * @param pendingLoginId Идентификатор записи.
   */
  markEmailVerified(pendingLoginId: string): Promise<void>;
  /**
   * Удаляет незавершённый вход.
   * @param pendingLoginId Идентификатор записи.
   */
  delete(pendingLoginId: string): Promise<void>;
}
