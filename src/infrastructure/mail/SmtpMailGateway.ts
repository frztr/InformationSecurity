import nodemailer from "nodemailer";
import type { IMailGateway } from "@/domain/identity/IMailGateway";

/**
 * Параметры SMTP-отправки.
 */
export type SmtpMailSettings = {
  host: string;
  port: number;
  from: string;
  user?: string;
  password?: string;
};

/**
 * Реализация IMailGateway через nodemailer (SMTP).
 */
export class SmtpMailGateway implements IMailGateway {
  public constructor(private readonly settings: SmtpMailSettings) {}

  /**
   * Отправляет текстовое письмо. TLS без проверки сертификата; auth только при заданных user и password.
   * @param toEmail Получатель.
   * @param subject Тема.
   * @param textBody Тело.
   * @returns Ничего.
   */
  public async send(toEmail: string, subject: string, textBody: string): Promise<void> {
    const transport = nodemailer.createTransport({
      host: this.settings.host,
      port: this.settings.port,
      secure: false,
      auth:
        this.settings.user && this.settings.password
          ? { user: this.settings.user, pass: this.settings.password }
          : undefined,
      tls: { rejectUnauthorized: false },
    });

    await transport.sendMail({
      from: this.settings.from,
      to: toEmail,
      subject,
      text: textBody,
    });
  }
}
