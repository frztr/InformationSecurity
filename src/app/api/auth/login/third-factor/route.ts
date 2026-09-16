import { NextResponse } from "next/server";
import { initializeApplication, getApplicationComposer } from "@/infrastructure/composition/ApplicationComposer";
import { PENDING_LOGIN_COOKIE_NAME, SESSION_COOKIE_NAME, readPendingLoginId } from "@/infrastructure/http/AuthCookies";

export async function POST(request: Request): Promise<Response> {
  await initializeApplication();
  const body = (await request.json()) as { code?: string };
  const pendingLoginId = await readPendingLoginId();

  try {
    const result = await getApplicationComposer().verifyThirdFactorUseCase.execute(pendingLoginId ?? "", body.code ?? "");
    const response = NextResponse.json({ next: "/workspace" });
    response.cookies.set(SESSION_COOKIE_NAME, result.sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      expires: result.expiresAt,
    });
    response.cookies.set(PENDING_LOGIN_COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Ошибка 3-го фактора" }, { status: 401 });
  }
}
