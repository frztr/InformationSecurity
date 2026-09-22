import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

/** Имя cookie сессии. */
export const SESSION_COOKIE_NAME = "is_session";
/** Имя cookie незавершённого входа. */
export const PENDING_LOGIN_COOKIE_NAME = "is_pending_login";

const COOKIE_BASE = { httpOnly: true, sameSite: "lax" as const, path: "/" };

/**
 * Читает токен сессии из cookie.
 * @returns Значение cookie или undefined.
 */
export async function readSessionToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value;
}

/**
 * Читает идентификатор незавершённого входа из cookie.
 * @returns Значение cookie или undefined.
 */
export async function readPendingLoginId(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(PENDING_LOGIN_COOKIE_NAME)?.value;
}

/**
 * Ставит httpOnly cookie незавершённого входа.
 * @param response Ответ Next.js.
 * @param pendingLoginId Идентификатор pending login.
 * @param maxAgeSeconds Срок жизни cookie в секундах.
 * @returns Ничего.
 */
export function setPendingLoginCookie(response: NextResponse, pendingLoginId: string, maxAgeSeconds: number): void {
  response.cookies.set(PENDING_LOGIN_COOKIE_NAME, pendingLoginId, {
    ...COOKIE_BASE,
    maxAge: maxAgeSeconds,
  });
}

/**
 * Ставит httpOnly cookie сессии с датой истечения.
 * @param response Ответ Next.js.
 * @param token Токен сессии.
 * @param expiresAt Срок действия.
 * @returns Ничего.
 */
export function setSessionCookie(response: NextResponse, token: string, expiresAt: Date): void {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    ...COOKIE_BASE,
    expires: expiresAt,
  });
}

/**
 * Сбрасывает cookie сессии.
 * @param response Ответ Next.js.
 * @returns Ничего.
 */
export function clearSessionCookie(response: NextResponse): void {
  clearCookie(response, SESSION_COOKIE_NAME);
}

/**
 * Сбрасывает cookie незавершённого входа.
 * @param response Ответ Next.js.
 * @returns Ничего.
 */
export function clearPendingLoginCookie(response: NextResponse): void {
  clearCookie(response, PENDING_LOGIN_COOKIE_NAME);
}

function clearCookie(response: NextResponse, name: string): void {
  response.cookies.set(name, "", { httpOnly: true, path: "/", maxAge: 0 });
}
