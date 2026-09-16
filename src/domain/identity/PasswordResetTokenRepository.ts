export interface PasswordResetTokenRepository {
  create(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  consumeUnused(tokenHash: string, now: Date): Promise<string | null>;
}
