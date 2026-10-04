import { NextResponse } from "next/server";
import type { UserAccount } from "@/domain/identity/UserAccount";
import { UserRole } from "@/domain/identity/UserRole";
import { getReadyServices } from "@/infrastructure/composition/ApplicationComposer";
import { authenticate, authorize } from "@/infrastructure/http/AuthenticationMiddleware";
import { SetEncryptionMethodRequest } from "@/infrastructure/http/contracts";
import { catchErrors, jsonFromResult } from "@/infrastructure/http/ErrorMiddleware";
import { endpoint } from "@/infrastructure/http/HttpPipeline";
import { jsonBody } from "@/infrastructure/http/RequestContractMiddleware";

/**
 * GET: список методов шифрования и признак их включения. Без аутентификации.
 */
export const GET = endpoint(async () => {
  const { administrationService } = await getReadyServices();
  return NextResponse.json({ methods: await administrationService.getAllEncryptionMethods() });
});

/**
 * POST: включает или выключает метод шифрования. Требует роль администратора.
 */
export const POST = endpoint(
  authenticate,
  authorize(UserRole.ADMIN),
  jsonBody(SetEncryptionMethodRequest),
  catchErrors(400, "Ошибка"),
  async ({ user, body }: { user: UserAccount; body: SetEncryptionMethodRequest }) => {
    const { administrationService } = await getReadyServices();
    return jsonFromResult(
      await administrationService.setEncryptionMethodEnabled(user, body.method, body.enabled),
      403,
      () => ({ ok: true }),
    );
  },
);
