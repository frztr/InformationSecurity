import { getReadyServices } from "@/infrastructure/composition/ApplicationComposer";
import { ConfirmPasswordResetRequest } from "@/infrastructure/http/contracts";
import { catchErrors, jsonFromResult } from "@/infrastructure/http/ErrorMiddleware";
import { endpoint } from "@/infrastructure/http/HttpPipeline";
import { jsonBody } from "@/infrastructure/http/RequestContractMiddleware";

/**
 * POST: подтверждает сброс пароля кодом из письма, токеном и новым паролем.
 */
export const POST = endpoint(
  jsonBody(ConfirmPasswordResetRequest),
  catchErrors(400, "Ошибка сброса пароля"),
  async ({ body }) => {
    const { passwordReset } = await getReadyServices();
    return jsonFromResult(
      await passwordReset.confirmPasswordReset(body.email, body.otpCode, body.resetToken, body.newPassword),
      400,
      () => ({ ok: true }),
    );
  },
);
