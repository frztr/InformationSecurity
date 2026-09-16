export type PendingLoginState = {
  id: string;
  userId: string;
  passwordVerified: boolean;
  emailVerified: boolean;
  expiresAt: Date;
};

export interface PendingLoginRepository {
  create(userId: string, expiresAt: Date): Promise<PendingLoginState>;
  findById(pendingLoginId: string): Promise<PendingLoginState | null>;
  markEmailVerified(pendingLoginId: string): Promise<void>;
  delete(pendingLoginId: string): Promise<void>;
}
