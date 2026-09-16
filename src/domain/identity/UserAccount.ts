import type { UserRole } from "@/domain/identity/UserRole";

export type UserAccount = {
  id: string;
  login: string;
  email: string;
  role: UserRole;
  totpSecretBase32: string;
  createdAt: Date;
};
