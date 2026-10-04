import { NextResponse } from "next/server";
import type { UserAccount } from "@/domain/identity/UserAccount";
import { getReadyServices } from "@/infrastructure/composition/ApplicationComposer";
import { authenticate } from "@/infrastructure/http/AuthenticationMiddleware";
import { EncryptMessageRequest } from "@/infrastructure/http/contracts";
import { catchErrors, jsonFromResult } from "@/infrastructure/http/ErrorMiddleware";
import { endpoint } from "@/infrastructure/http/HttpPipeline";
import { jsonBody } from "@/infrastructure/http/RequestContractMiddleware";

export const maxDuration = 120;

/**
 * GET: журнал зашифрованных сообщений, доступных текущему пользователю. Требует аутентификацию.
 */
export const GET = endpoint(authenticate, async ({ user }: { user: UserAccount }) => {
  const { messageService } = await getReadyServices();
  return NextResponse.json({ messages: await messageService.getEncryptedMessages(user) });
});

/**
 * POST: шифрует текст выбранным методом и сохраняет запись. Требует аутентификацию.
 */
export const POST = endpoint(
  authenticate,
  jsonBody(EncryptMessageRequest),
  catchErrors(400, "Ошибка шифрования"),
  async ({ user, body }: { user: UserAccount; body: EncryptMessageRequest }) => {
    const { messageService } = await getReadyServices();
    return jsonFromResult(await messageService.encryptMessage(user.id, body.plaintext, body.method), 400, (message) => ({
      message,
    }));
  },
);
