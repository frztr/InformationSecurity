import { NextResponse } from "next/server";
import { getReadyServices } from "@/infrastructure/composition/ApplicationComposer";
import { authenticate } from "@/infrastructure/http/AuthenticationMiddleware";
import { MessageIdRouteParams } from "@/infrastructure/http/contracts";
import { catchErrors, fromResult } from "@/infrastructure/http/ErrorMiddleware";
import { endpoint } from "@/infrastructure/http/HttpPipeline";
import { routeParams } from "@/infrastructure/http/RequestContractMiddleware";

export const maxDuration = 120;

/**
 * GET: отдаёт подписанный PDF записи журнала. Требует аутентификацию.
 */
export const GET = endpoint(
  authenticate,
  routeParams(MessageIdRouteParams),
  catchErrors(400, "Ошибка PDF"),
  async ({ user, routeParams: params }) => {
    const { messages } = await getReadyServices();
    return fromResult(await messages.exportMessageAsSignedPdf(user, params.messageId), 400, (resultDto) => {
      return new NextResponse(Buffer.from(resultDto.pdfBytes), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${resultDto.fileName}"`,
        },
      });
    });
  },
);
