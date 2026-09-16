import nodemailer from "nodemailer";
import type { MailGateway } from "@/domain/identity/MailGateway";

export type SmtpMailSettings = {
  host: string;
  port: number;
  from: string;
  user?: string;
  password?: string;
};

export class SmtpMailGateway implements MailGateway {
  public constructor(private readonly settings: SmtpMailSettings) {}

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
