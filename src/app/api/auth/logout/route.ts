import { NextResponse } from "next/server";
import { initializeApplication, getApplicationComposer } from "@/infrastructure/composition/ApplicationComposer";
import { SESSION_COOKIE_NAME, readSessionToken } from "@/infrastructure/http/AuthCookies";
import { hashOpaqueSecret } from "@/infrastructure/identity/SecretDigest";

export async function POST(): Promise<Response> {
  await initializeApplication();
  const token = await readSessionToken();
  if (token) {
    await getApplicationComposer().sessionRepository.deleteByTokenHash(hashOpaqueSecret(token));
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
