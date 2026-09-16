import { NextResponse } from "next/server";
import { initializeApplication, getApplicationComposer } from "@/infrastructure/composition/ApplicationComposer";

export async function POST(request: Request): Promise<Response> {
  await initializeApplication();
  const body = (await request.json()) as {
    email?: string;
    otpCode?: string;
    resetToken?: string;
    newPassword?: string;
  };

  try {
    await getApplicationComposer().confirmPasswordResetUseCase.execute(
      body.email ?? "",
      body.otpCode ?? "",
      body.resetToken ?? "",
      body.newPassword ?? "",
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Ошибка сброса пароля" }, { status: 400 });
  }
}
