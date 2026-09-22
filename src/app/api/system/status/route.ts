import { NextResponse } from "next/server";
import { getReadyServices } from "@/infrastructure/composition/ApplicationComposer";
import { getCurrentUser } from "@/infrastructure/http/AuthenticationMiddleware";

/**
 * GET: статус системы, методы шифрования и текущий актор (гость или вошедший пользователь).
 */
export async function GET(): Promise<Response> {
  const { administration, system } = await getReadyServices();
  const [status, methods, user] = await Promise.all([
    system.getSystemStatus(),
    administration.getAllEncryptionMethods(),
    getCurrentUser(),
  ]);

  return NextResponse.json({
    ...status,
    methods,
    actor: user
      ? { id: user.id, login: user.login, email: user.email, role: user.role }
      : { role: "GUEST" },
  });
}
