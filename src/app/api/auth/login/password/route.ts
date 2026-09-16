import { NextResponse } from "next/server";
import { initializeApplication, getApplicationComposer } from "@/infrastructure/composition/ApplicationComposer";
import { PENDING_LOGIN_COOKIE_NAME } from "@/infrastructure/http/AuthCookies";

export async function POST(request: Request): Promise<Response> {
  await initializeApplication();
  const body = (await request.json()) as { login?: string; password?: string };

  try {
    const result = await getApplicationComposer().loginPasswordUseCase.execute(body.login ?? "", body.password ?? "");
    const response = NextResponse.json({ emailHint: result.emailHint, next: "/login/email" });
    response.cookies.set(PENDING_LOGIN_COOKIE_NAME, result.pendingLoginId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60,
    });
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Ошибка входа" }, { status: 401 });
  }
}
