import { NextResponse } from "next/server";
import { EncryptionMethod } from "@/domain/cryptography/EncryptionMethod";
import { UserRole } from "@/domain/identity/UserRole";
import { initializeApplication, getApplicationComposer, resolveSessionUser } from "@/infrastructure/composition/ApplicationComposer";
import { readSessionToken } from "@/infrastructure/http/AuthCookies";

export async function GET(): Promise<Response> {
  await initializeApplication();
  const methods = await getApplicationComposer().encryptionMethodCatalog.list();
  return NextResponse.json({ methods });
}

export async function POST(request: Request): Promise<Response> {
  await initializeApplication();
  const user = await resolveSessionUser(await readSessionToken());
  if (!user || user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Только администратор" }, { status: 403 });
  }

  const body = (await request.json()) as { method?: string; enabled?: boolean };
  const method = body.method === EncryptionMethod.KUZNYECHIK ? EncryptionMethod.KUZNYECHIK : EncryptionMethod.RSA;

  try {
    await getApplicationComposer().toggleEncryptionMethodUseCase.execute(user, method, Boolean(body.enabled));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Ошибка" }, { status: 400 });
  }
}
