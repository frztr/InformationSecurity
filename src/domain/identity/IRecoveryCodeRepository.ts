/**
 * Хранилище кодов восстановления третьего фактора.
 */
export interface IRecoveryCodeRepository {
  /**
   * Заменяет набор кодов пользователя.
   * @param userId Идентификатор пользователя.
   * @param codeHashes Хэши новых кодов.
   */
  replaceAll(userId: string, codeHashes: string[]): Promise<void>;
  /**
   * Поглощает неиспользованный код.
   * @param userId Идентификатор пользователя.
   * @param codeHash Хэш предъявленного кода.
   * @returns `true`, если код принят.
   */
  consumeUnused(userId: string, codeHash: string): Promise<boolean>;
}
