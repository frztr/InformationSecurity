import { getJson } from "@/ui/http/HttpClient";

/** Текущий пользователь шапки: гость либо вошедший с логином. */
export type HeaderActor = { role: "GUEST" } | { role: "USER" | "ADMIN"; login: string };

/** Адреса почты, которые формы показывают ссылкой. */
export type MailLinks = {
  webmailUrl: string;
  signupUrl: string;
  domain: string;
};

/** Ответ `/api/session`. */
export type SessionContext = {
  actor?: HeaderActor;
  mail?: Partial<MailLinks>;
};

/**
 * Запрашивает текущего актора и ссылки почтового сервиса.
 */
export async function getSessionContext(): Promise<SessionContext> {
  return getJson<SessionContext>("/api/session");
}
