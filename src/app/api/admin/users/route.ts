import { UserRole } from "@/domain/identity/UserRole";
import { getReadyServices } from "@/infrastructure/composition/ApplicationComposer";
import { authenticate, authorize } from "@/infrastructure/http/AuthenticationMiddleware";
import { CreateUserByAdminRequest } from "@/infrastructure/http/contracts";
import { catchErrors, jsonFromResult } from "@/infrastructure/http/ErrorMiddleware";
import { endpoint } from "@/infrastructure/http/HttpPipeline";
import { jsonBody } from "@/infrastructure/http/RequestContractMiddleware";

/**
 * GET: список всех пользователей. Требует роль администратора.
 */
export const GET = endpoint(authenticate, authorize(UserRole.ADMIN), async ({ user }) => {
  const { administration } = await getReadyServices();
  return jsonFromResult(await administration.getAllUsers(user), 403, (users) => ({
    users: users.map((item) => ({
      id: item.id,
      login: item.login,
      email: item.email,
      role: item.role,
      createdAt: item.createdAt,
    })),
  }));
});

/**
 * POST: создаёт учётную запись. Требует роль администратора.
 */
export const POST = endpoint(
  authenticate,
  authorize(UserRole.ADMIN),
  jsonBody(CreateUserByAdminRequest),
  catchErrors(400, "Ошибка создания"),
  async ({ user, body }) => {
    const { administration } = await getReadyServices();
    return jsonFromResult(await administration.createUserAccount(user, body), 400);
  },
);
