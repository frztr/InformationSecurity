export interface MailGateway {
  send(toEmail: string, subject: string, textBody: string): Promise<void>;
}
