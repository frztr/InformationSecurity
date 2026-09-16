import type { PasswordHash } from "@/domain/identity/PasswordHash";
import type { UserAccount } from "@/domain/identity/UserAccount";
import type { UserRole } from "@/domain/identity/UserRole";

export type NewUserAccount = {
  login: string;
  email: string;
  role: UserRole;
  passwordHash: PasswordHash;
  totpSecretBase32: string;
};

export interface UserAccountRepository {
  findByLogin(login: string): Promise<UserAccount | null>;
  findByEmail(email: string): Promise<UserAccount | null>;
  findById(userId: string): Promise<UserAccount | null>;
  listAll(): Promise<UserAccount[]>;
  insert(newUser: NewUserAccount): Promise<UserAccount>;
  getPasswordHash(userId: string): Promise<PasswordHash>;
  updatePassword(userId: string, passwordHash: PasswordHash): Promise<void>;
}
