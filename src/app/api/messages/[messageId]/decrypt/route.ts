import { NextResponse } from "next/server";
import { initializeApplication, getApplicationComposer, resolveSessionUser } from "@/infrastructure/composition/ApplicationComposer";
import { readSessionToken } from "@/infrastructure/http/AuthCookies";

export const maxDuration = 120;

export async function POST(
  _request: Request,
  context: { params: Promise<{ messageId: string }> },
): Promise<Response> {
  await initializeApplication();
  const user = await resolveSessionUser(await readSessionToken());
  if (!user) {
    return NextResponse.json({ error: "Нужна аутентификация" }, { status: 401 });
  }

  const { messageId } = await context.params;
  try {
    const result = await getApplicationComposer().decryptMessageUseCase.execute(user, messageId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Ошибка расшифрования" }, { status: 400 });
  }
}
