import { getJson } from "@/ui/http/HttpClient";

/** Текущий пользователь шапки: гость либо вошедший с логином. */
export type HeaderActor = { role: "GUEST" } | { role: "USER" | "ADMIN"; login: string };

/** Ответ `/api/system/status` с актором и ссылками почты. */
export type SystemStatusResponse = {
  actor?: HeaderActor;
  mail?: { webmailUrl?: string; signupUrl?: string; domain?: string };
};

/**
 * Запрашивает статус системы, актора сессии и ссылки почтового сервиса.
 * @returns Тело ответа `/api/system/status`.
 */
export async function getSystemStatus(): Promise<SystemStatusResponse> {
  return getJson<SystemStatusResponse>("/api/system/status");
}
