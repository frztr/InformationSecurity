import { NextResponse } from "next/server";
import { initializeApplication, getApplicationComposer } from "@/infrastructure/composition/ApplicationComposer";
import { readPendingLoginId } from "@/infrastructure/http/AuthCookies";

export async function POST(request: Request): Promise<Response> {
  await initializeApplication();
  const body = (await request.json()) as { otpCode?: string };
  const pendingLoginId = await readPendingLoginId();

  try {
    await getApplicationComposer().verifyEmailOtpUseCase.execute(pendingLoginId ?? "", body.otpCode ?? "");
    return NextResponse.json({ next: "/login/totp" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Ошибка 2-го фактора" }, { status: 401 });
  }
}
