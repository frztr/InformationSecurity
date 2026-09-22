import type { EncryptionMethod } from "@/domain/cryptography/EncryptionMethod";
import type { UserRole } from "@/domain/identity/UserRole";
import { postJson } from "@/ui/http/HttpClient";

/**
 * Включает или выключает метод шифрования для всех пользователей.
 * @param method Идентификатор метода.
 * @param enabled Признак доступности метода.
 */
export async function setEncryptionMethodEnabled(method: EncryptionMethod, enabled: boolean): Promise<void> {
  await postJson("/api/admin/methods", { method, enabled }, "Не удалось изменить метод");
}

/**
 * Создаёт учётную запись от имени администратора.
 * @param input Логин, почта, пароль и роль.
 * @returns Коды восстановления новой учётной записи.
 */
export async function createUserAccount(input: {
  login: string;
  email: string;
  password: string;
  role: UserRole;
}): Promise<{ recoveryCodes: string[] }> {
  const payload = await postJson<{ recoveryCodes?: string[] }>(
    "/api/admin/users",
    {
      login: input.login,
      email: input.email,
      password: input.password,
      passwordConfirmation: input.password,
      role: input.role,
    },
  );
  return { recoveryCodes: payload.recoveryCodes ?? [] };
}
