import { NextResponse } from "next/server";
import { EncryptionMethod } from "@/domain/cryptography/EncryptionMethod";
import { initializeApplication, getApplicationComposer, resolveSessionUser } from "@/infrastructure/composition/ApplicationComposer";
import { readSessionToken } from "@/infrastructure/http/AuthCookies";

export const maxDuration = 120;

export async function GET(): Promise<Response> {
  await initializeApplication();
  const user = await resolveSessionUser(await readSessionToken());
  if (!user) {
    return NextResponse.json({ error: "Нужна аутентификация" }, { status: 401 });
  }

  const messages = await getApplicationComposer().listMessagesUseCase.execute(user);
  return NextResponse.json({ messages });
}

export async function POST(request: Request): Promise<Response> {
  await initializeApplication();
  const user = await resolveSessionUser(await readSessionToken());
  if (!user) {
    return NextResponse.json({ error: "Нужна аутентификация" }, { status: 401 });
  }

  const body = (await request.json()) as { plaintext?: string; method?: string };
  const method = body.method === EncryptionMethod.KUZNYECHIK ? EncryptionMethod.KUZNYECHIK : EncryptionMethod.RSA;

  try {
    const message = await getApplicationComposer().encryptMessageUseCase.execute(user.id, body.plaintext ?? "", method);
    return NextResponse.json({ message });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Ошибка шифрования" }, { status: 400 });
  }
}
