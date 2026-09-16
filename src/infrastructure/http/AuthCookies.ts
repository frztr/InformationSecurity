import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "is_session";
export const PENDING_LOGIN_COOKIE_NAME = "is_pending_login";

export async function readSessionToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value;
}

export async function readPendingLoginId(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(PENDING_LOGIN_COOKIE_NAME)?.value;
}

export function buildSessionCookie(token: string, expiresAt: Date): {
  name: string;
  value: string;
  options: {
    httpOnly: true;
    sameSite: "lax";
    path: string;
    expires: Date;
  };
} {
  return {
    name: SESSION_COOKIE_NAME,
    value: token,
    options: {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    },
  };
}
