import { NextResponse } from "next/server";
import { getReadyServices } from "@/infrastructure/composition/ApplicationComposer";
import { clearPendingLoginCookie, readPendingLoginId, setSessionCookie } from "@/infrastructure/http/AuthCookies";
import { VerifyThirdFactorRequest } from "@/infrastructure/http/contracts";
import { catchErrors, fromResult } from "@/infrastructure/http/ErrorMiddleware";
import { endpoint } from "@/infrastructure/http/HttpPipeline";
import { jsonBody } from "@/infrastructure/http/RequestContractMiddleware";

/**
 * POST: проверяет третий фактор, выдаёт cookie сессии и снимает cookie незавершённого входа.
 */
export const POST = endpoint(
  jsonBody(VerifyThirdFactorRequest),
  catchErrors(401, "Ошибка 3-го фактора"),
  async ({ body }: { body: VerifyThirdFactorRequest }) => {
    const { authenticationService } = await getReadyServices();
    return fromResult(
      await authenticationService.verifyThirdFactor((await readPendingLoginId()) ?? "", body.code),
      401,
      (resultDto) => {
        const response = NextResponse.json({ next: "/workspace" });
        setSessionCookie(response, resultDto.sessionToken, resultDto.expiresAt);
        clearPendingLoginCookie(response);
        return response;
      },
    );
  },
);
