"use client";

import { useEffect, useState } from "react";
import { getSystemStatus, type HeaderActor, type SystemStatusResponse } from "@/ui/api/systemApi";

/**
 * Загружает статус системы и текущего актора для шапки и форм.
 * @returns Признак готовности, актор сессии и ссылки почтового сервиса.
 */
export function useSystemStatus() {
  const [status, setStatus] = useState<SystemStatusResponse | undefined>(undefined);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void getSystemStatus()
      .then(setStatus)
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);

  const actor: HeaderActor = status?.actor ?? { role: "GUEST" };

  return {
    ready,
    actor,
    mail: {
      webmailUrl: status?.mail?.webmailUrl ?? "",
      signupUrl: status?.mail?.signupUrl ?? "",
      domain: status?.mail?.domain ?? "",
    },
  };
}

/**
 * Убирает схему из URL для отображения хоста.
 * @param url Полный URL.
 * @returns Хост без `http://` или `https://`.
 */
export function publicHostLabel(url: string): string {
  return url.replace(/^https?:\/\//, "");
}
