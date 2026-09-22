import { getReadyServices } from "@/infrastructure/composition/ApplicationComposer";
import { RegisterUserRequest } from "@/infrastructure/http/contracts";
import { catchErrors, jsonFromResult } from "@/infrastructure/http/ErrorMiddleware";
import { endpoint } from "@/infrastructure/http/HttpPipeline";
import { jsonBody } from "@/infrastructure/http/RequestContractMiddleware";

/**
 * POST: регистрирует учётную запись и возвращает данные привязки TOTP.
 */
export const POST = endpoint(
  jsonBody(RegisterUserRequest),
  catchErrors(400, "Ошибка регистрации"),
  async ({ body }) => {
    const { registration } = await getReadyServices();
    return jsonFromResult(await registration.registerUser(body), 400);
  },
);
