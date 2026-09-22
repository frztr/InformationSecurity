import { NextResponse } from "next/server";
import { getReadyServices } from "@/infrastructure/composition/ApplicationComposer";
import { clearSessionCookie, readSessionToken } from "@/infrastructure/http/AuthCookies";
import { endpoint } from "@/infrastructure/http/HttpPipeline";

/**
 * POST: завершает сессию и снимает cookie сессии.
 */
export const POST = endpoint(async () => {
  const { authentication } = await getReadyServices();
  await authentication.logout(await readSessionToken());
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
});
