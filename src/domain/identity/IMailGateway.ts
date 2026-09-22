/**
 * Отправка текстовых писем.
 */
export interface IMailGateway {
  /**
   * Отправляет письмо.
   * @param toEmail Адрес получателя.
   * @param subject Тема.
   * @param textBody Текст тела письма.
   */
  send(toEmail: string, subject: string, textBody: string): Promise<void>;
}
