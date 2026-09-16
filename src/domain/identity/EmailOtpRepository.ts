export type EmailOtpPurpose = "LOGIN" | "PASSWORD_RESET";

export type EmailOtpRecord = {
  id: string;
  userId: string;
  purpose: EmailOtpPurpose;
  expiresAt: Date;
};

export interface EmailOtpRepository {
  create(userId: string, purpose: EmailOtpPurpose, codeHash: string, expiresAt: Date): Promise<EmailOtpRecord>;
  consumeUnused(userId: string, purpose: EmailOtpPurpose, codeHash: string, now: Date): Promise<boolean>;
}
