import { NextResponse } from "next/server";
import { initializeApplication, getApplicationComposer } from "@/infrastructure/composition/ApplicationComposer";

export async function POST(request: Request): Promise<Response> {
  await initializeApplication();
  const body = (await request.json()) as { email?: string };
  await getApplicationComposer().requestPasswordResetUseCase.execute(body.email ?? "");
  return NextResponse.json({
    message: "Если адрес есть в системе, письмо с кодом и токеном отправлено.",
  });
}
