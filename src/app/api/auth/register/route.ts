import { NextResponse } from "next/server";
import { initializeApplication, getApplicationComposer } from "@/infrastructure/composition/ApplicationComposer";

export async function POST(request: Request): Promise<Response> {
  await initializeApplication();
  const body = (await request.json()) as {
    login?: string;
    email?: string;
    password?: string;
    passwordConfirmation?: string;
  };

  try {
    const result = await getApplicationComposer().registerUserUseCase.execute({
      login: body.login ?? "",
      email: body.email ?? "",
      password: body.password ?? "",
      passwordConfirmation: body.passwordConfirmation ?? "",
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Ошибка регистрации" }, { status: 400 });
  }
}
