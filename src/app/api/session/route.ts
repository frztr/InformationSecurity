import { NextResponse } from "next/server";
import { getReadyServices } from "@/infrastructure/composition/ApplicationComposer";
import { getCurrentUser } from "@/infrastructure/http/AuthenticationMiddleware";

/**
 * GET: текущий актор и адреса почты для шапки и форм.
 */
export async function GET(): Promise<Response> {
  const { applicationSettings } = await getReadyServices();
  const user = await getCurrentUser();

  return NextResponse.json({
    mail: {
      domain: applicationSettings.mail.domain,
      webmailUrl: applicationSettings.mail.webmailUrl,
      signupUrl: applicationSettings.mail.signupUrl,
    },
    actor: user ? { login: user.login, role: user.role } : { role: "GUEST" },
  });
}
