import { NextResponse } from "next/server";
import { getReadyServices } from "@/infrastructure/composition/ApplicationComposer";
import { setPendingLoginCookie } from "@/infrastructure/http/AuthCookies";
import { LoginPasswordRequest } from "@/infrastructure/http/contracts";
import { catchErrors, fromResult } from "@/infrastructure/http/ErrorMiddleware";
import { endpoint } from "@/infrastructure/http/HttpPipeline";
import { jsonBody } from "@/infrastructure/http/RequestContractMiddleware";

/**
 * POST: проверяет логин и пароль, ставит cookie незавершённого входа и отправляет код на почту.
 */
export const POST = endpoint(
  jsonBody(LoginPasswordRequest),
  catchErrors(401, "Ошибка входа"),
  async ({ body }: { body: LoginPasswordRequest }) => {
    const { authenticationService, applicationSettings } = await getReadyServices();
    return fromResult(await authenticationService.loginWithPassword(body.login, body.password), 401, (resultDto) => {
      const response = NextResponse.json({ emailHint: resultDto.emailHint, next: "/login/email" });
      setPendingLoginCookie(response, resultDto.pendingLoginId, applicationSettings.auth.pendingLoginTtlMinutes * 60);
      return response;
    });
  },
);
