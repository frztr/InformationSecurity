/**
 * Назначение одноразового кода из письма.
 */
export type EmailOtpPurpose = "LOGIN" | "PASSWORD_RESET";

/**
 * Запись одноразового кода из письма.
 */
export type EmailOtpRecord = {
  id: string;
  userId: string;
  purpose: EmailOtpPurpose;
  expiresAt: Date;
};

/**
 * Хранилище одноразовых кодов из письма.
 */
export interface IEmailOtpRepository {
  /**
   * Сохраняет хэш кода.
   * @param userId Идентификатор пользователя.
   * @param purpose Назначение кода.
   * @param codeHash Хэш кода.
   * @param expiresAt Срок действия.
   */
  create(userId: string, purpose: EmailOtpPurpose, codeHash: string, expiresAt: Date): Promise<EmailOtpRecord>;
  /**
   * Поглощает неиспользованный действующий код.
   * @param userId Идентификатор пользователя.
   * @param purpose Назначение кода.
   * @param codeHash Хэш предъявленного кода.
   * @param now Текущий момент времени.
   * @returns `true`, если код принят.
   */
  consumeUnused(userId: string, purpose: EmailOtpPurpose, codeHash: string, now: Date): Promise<boolean>;
}
