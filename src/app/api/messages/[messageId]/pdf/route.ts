import { NextResponse } from "next/server";
import { initializeApplication, getApplicationComposer, resolveSessionUser } from "@/infrastructure/composition/ApplicationComposer";
import { readSessionToken } from "@/infrastructure/http/AuthCookies";

export const maxDuration = 120;

export async function GET(
  _request: Request,
  context: { params: Promise<{ messageId: string }> },
): Promise<Response> {
  await initializeApplication();
  const user = await resolveSessionUser(await readSessionToken());
  if (!user) {
    return NextResponse.json({ error: "Нужна аутентификация" }, { status: 401 });
  }

  const { messageId } = await context.params;
  try {
    const result = await getApplicationComposer().exportSignedPdfUseCase.execute(user, messageId);
    return new NextResponse(Buffer.from(result.pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${result.fileName}"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Ошибка PDF" }, { status: 400 });
  }
}
