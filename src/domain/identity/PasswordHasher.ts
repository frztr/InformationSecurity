import type { PasswordHash } from "@/domain/identity/PasswordHash";

export interface PasswordHasher {
  hash(password: string): Promise<PasswordHash>;
  verify(password: string, storedHash: PasswordHash): Promise<boolean>;
}
