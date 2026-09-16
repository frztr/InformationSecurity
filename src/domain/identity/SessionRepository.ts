export type SessionRecord = {
  id: string;
  userId: string;
  expiresAt: Date;
};

export interface SessionRepository {
  create(userId: string, tokenHash: string, expiresAt: Date): Promise<SessionRecord>;
  findByTokenHash(tokenHash: string): Promise<SessionRecord | null>;
  deleteByTokenHash(tokenHash: string): Promise<void>;
}
