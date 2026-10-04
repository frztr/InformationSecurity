import { getReadyServices } from "@/infrastructure/composition/ApplicationComposer";
import { readPendingLoginId } from "@/infrastructure/http/AuthCookies";
import { VerifyEmailOtpRequest } from "@/infrastructure/http/contracts";
import { catchErrors, jsonFromResult } from "@/infrastructure/http/ErrorMiddleware";
import { endpoint } from "@/infrastructure/http/HttpPipeline";
import { jsonBody } from "@/infrastructure/http/RequestContractMiddleware";

/**
 * POST: проверяет код из письма (второй фактор) по cookie незавершённого входа.
 */
export const POST = endpoint(
  jsonBody(VerifyEmailOtpRequest),
  catchErrors(401, "Ошибка 2-го фактора"),
  async ({ body }: { body: VerifyEmailOtpRequest }) => {
    const { authenticationService } = await getReadyServices();
    return jsonFromResult(
      await authenticationService.verifyEmailOtp((await readPendingLoginId()) ?? "", body.otpCode),
      401,
      () => ({ next: "/login/totp" }),
    );
  },
);
