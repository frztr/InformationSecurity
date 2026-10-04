import { cache } from "react";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import type { UserAccount } from "@/domain/identity/UserAccount";
import { UserRole } from "@/domain/identity/UserRole";
import { getReadyServices } from "@/infrastructure/composition/ApplicationComposer";
import { readSessionToken } from "@/infrastructure/http/AuthCookies";
import type { HttpContext, HttpHandler } from "@/infrastructure/http/HttpPipeline";

/**
 * Возвращает текущего пользователя по cookie сессии; результат мемоизируется в рамках запроса React.
 * @returns Учётная запись или null.
 */
export const getCurrentUser = cache(async (): Promise<UserAccount | null> => {
  const { authenticationService } = await getReadyServices();
  return authenticationService.getUserBySessionToken(await readSessionToken());
});

/**
 * Для страниц: требует сессию и, если роли заданы, вхождение в список; иначе redirect.
 * @param roles Допустимые роли; пустой список — любой аутентифицированный.
 * @returns Учётная запись.
 */
export async function authorizePage(...roles: UserRole[]): Promise<UserAccount> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (roles.length > 0 && !roles.includes(user.role)) {
    redirect("/workspace");
  }
  return user;
}

/**
 * Для API: 401 без сессии, иначе передаёт user в контекст.
 * @param handler Следующий обработчик.
 * @returns Обработчик с проверкой сессии.
 */
export function authenticate<TIn extends HttpContext>(
  handler: HttpHandler<TIn & { user: UserAccount }>,
): HttpHandler<TIn> {
  return async (context) => {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Нужна аутентификация" }, { status: 401 });
    }
    return handler({ ...context, user });
  };
}

/**
 * Для API: 403, если роль пользователя не в списке. Сообщение «Только администратор» при единственной роли ADMIN.
 * @param roles Допустимые роли.
 * @returns Middleware проверки роли.
 */
export function authorize(...roles: UserRole[]) {
  return <TIn extends HttpContext & { user: UserAccount }>(handler: HttpHandler<TIn>): HttpHandler<TIn> =>
    async (context) => {
      if (!roles.includes(context.user.role)) {
        return NextResponse.json(
          { error: roles.length === 1 && roles[0] === UserRole.ADMIN ? "Только администратор" : "Недостаточно прав" },
          { status: 403 },
        );
      }
      return handler(context);
    };
}
