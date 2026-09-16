import { NextResponse } from "next/server";
import { UserRole } from "@/domain/identity/UserRole";
import { initializeApplication, getApplicationComposer, resolveSessionUser } from "@/infrastructure/composition/ApplicationComposer";
import { readSessionToken } from "@/infrastructure/http/AuthCookies";

export async function GET(): Promise<Response> {
  await initializeApplication();
  const user = await resolveSessionUser(await readSessionToken());
  if (!user || user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Только администратор" }, { status: 403 });
  }
  const users = await getApplicationComposer().userAccountRepository.listAll();
  return NextResponse.json({
    users: users.map((item) => ({
      id: item.id,
      login: item.login,
      email: item.email,
      role: item.role,
      createdAt: item.createdAt,
    })),
  });
}

export async function POST(request: Request): Promise<Response> {
  await initializeApplication();
  const user = await resolveSessionUser(await readSessionToken());
  if (!user || user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Только администратор" }, { status: 403 });
  }

  const body = (await request.json()) as {
    login?: string;
    email?: string;
    password?: string;
    passwordConfirmation?: string;
    role?: string;
  };

  try {
    const result = await getApplicationComposer().createUserByAdminUseCase.execute(user, {
      login: body.login ?? "",
      email: body.email ?? "",
      password: body.password ?? "",
      passwordConfirmation: body.passwordConfirmation ?? "",
      role: body.role === UserRole.ADMIN ? UserRole.ADMIN : UserRole.USER,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Ошибка создания" }, { status: 400 });
  }
}
