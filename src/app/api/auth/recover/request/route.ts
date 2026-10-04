import { NextResponse } from "next/server";
import { getReadyServices } from "@/infrastructure/composition/ApplicationComposer";
import { RequestPasswordResetRequest } from "@/infrastructure/http/contracts";
import { endpoint } from "@/infrastructure/http/HttpPipeline";
import { jsonBody } from "@/infrastructure/http/RequestContractMiddleware";

/**
 * POST: запрашивает письмо со кодом и токеном сброса пароля, если адрес есть в системе.
 */
export const POST = endpoint(jsonBody(RequestPasswordResetRequest), async ({ body }: { body: RequestPasswordResetRequest }) => {
  const { passwordResetService } = await getReadyServices();
  await passwordResetService.requestPasswordReset(body.email);
  return NextResponse.json({
    message: "Если адрес есть в системе, письмо с кодом и токеном отправлено.",
  });
});
