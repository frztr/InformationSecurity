import { getReadyServices } from "@/infrastructure/composition/ApplicationComposer";
import { authenticate } from "@/infrastructure/http/AuthenticationMiddleware";
import { MessageIdRouteParams } from "@/infrastructure/http/contracts";
import { catchErrors, jsonFromResult } from "@/infrastructure/http/ErrorMiddleware";
import { endpoint } from "@/infrastructure/http/HttpPipeline";
import { routeParams } from "@/infrastructure/http/RequestContractMiddleware";

export const maxDuration = 120;

/**
 * POST: расшифровывает запись журнала по идентификатору. Требует аутентификацию.
 */
export const POST = endpoint(
  authenticate,
  routeParams(MessageIdRouteParams),
  catchErrors(400, "Ошибка расшифрования"),
  async ({ user, routeParams: params }) => {
    const { messages } = await getReadyServices();
    return jsonFromResult(await messages.decryptMessage(user, params.messageId), 400);
  },
);
