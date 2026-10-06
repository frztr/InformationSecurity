import type { UserRole } from "@/domain/identity/UserRole";

/**
 * Учётная запись пользователя.
 */
export type UserAccount = {
  id: string;
  login: string;
  email: string;
  role: UserRole;
  createdAt: Date;
};
