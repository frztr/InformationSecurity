/**
 * Роль учётной записи.
 */
export const UserRole = {
  USER: "USER",
  ADMIN: "ADMIN",
} as const;

/**
 * Идентификатор роли учётной записи.
 */
export type UserRole = (typeof UserRole)[keyof typeof UserRole];
