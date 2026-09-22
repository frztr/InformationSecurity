import { postJson } from "@/ui/http/HttpClient";

/** Секрет TOTP, QR и коды восстановления, выдаваемые при регистрации. */
export type Enrollment = {
  otpAuthUrl: string;
  totpSecretBase32: string;
  recoveryCodes: string[];
  qrDataUrl: string;
};

/**
 * Отправляет логин и пароль (первый фактор входа).
 * @param login Логин.
 * @param password Пароль.
 * @returns Следующий шаг входа и подсказка адреса почты.
 */
export async function loginWithPassword(login: string, password: string): Promise<{ next: string; emailHint: string }> {
  const payload = await postJson<{ next?: string; emailHint?: string }>(
    "/api/auth/login/password",
    { login, password },
    "Ошибка входа",
  );
  return {
    next: payload.next ?? "/login/email",
    emailHint: payload.emailHint ?? "",
  };
}

/**
 * Проверяет одноразовый код из письма (второй фактор).
 * @param otpCode Код из письма.
 * @returns Следующий шаг входа.
 */
export async function verifyEmailOtp(otpCode: string): Promise<{ next: string }> {
  const payload = await postJson<{ next?: string }>("/api/auth/login/email-otp", { otpCode });
  return { next: payload.next ?? "/login/totp" };
}

/**
 * Проверяет TOTP или код восстановления (третий фактор).
 * @param code TOTP либо одноразовый код восстановления.
 * @returns Путь после успешного входа.
 */
export async function verifyThirdFactor(code: string): Promise<{ next: string }> {
  const payload = await postJson<{ next?: string }>("/api/auth/login/third-factor", { code });
  return { next: payload.next ?? "/workspace" };
}

/**
 * Регистрирует учётную запись и возвращает данные привязки TOTP.
 * @param input Логин, почта, пароль и подтверждение пароля.
 * @returns Секрет TOTP, QR и коды восстановления.
 */
export async function registerUser(input: {
  login: string;
  email: string;
  password: string;
  passwordConfirmation: string;
}): Promise<Enrollment> {
  return postJson<Enrollment>("/api/auth/register", input, "Ошибка регистрации");
}

/**
 * Запрашивает письмо для сброса пароля.
 * @param email Адрес почты.
 * @returns Текст ответа сервера.
 */
export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  const payload = await postJson<{ message?: string }>(
    "/api/auth/recover/request",
    { email },
    "Не удалось отправить письмо",
  );
  return { message: payload.message ?? "Письмо отправлено, если адрес существует." };
}

/**
 * Подтверждает сброс пароля кодом из письма, токеном и новым паролем.
 * @param input Почта, OTP, токен сброса и новый пароль.
 */
export async function confirmPasswordReset(input: {
  email: string;
  otpCode: string;
  resetToken: string;
  newPassword: string;
}): Promise<void> {
  await postJson("/api/auth/recover/confirm", input);
}

/** Завершает текущую сессию на сервере. */
export async function logoutSession(): Promise<void> {
  await postJson("/api/auth/logout");
}
