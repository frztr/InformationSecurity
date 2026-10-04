"use client";

import { useEffect, useState } from "react";
import { getSessionContext, type HeaderActor, type MailLinks } from "@/ui/api/sessionApi";

/**
 * Загружает актора сессии и ссылки почты для шапки и форм.
 */
export function useSessionContext() {
  const [loaded, setLoaded] = useState(false);
  const [actor, setActor] = useState<HeaderActor>({ role: "GUEST" });
  const [mail, setMail] = useState<MailLinks>({ webmailUrl: "", signupUrl: "", domain: "" });

  useEffect(() => {
    void getSessionContext()
      .then((context) => {
        setActor(context.actor ?? { role: "GUEST" });
        setMail({
          webmailUrl: context.mail?.webmailUrl ?? "",
          signupUrl: context.mail?.signupUrl ?? "",
          domain: context.mail?.domain ?? "",
        });
      })
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, []);

  return { loaded, actor, mail };
}

/**
 * Убирает схему из URL для отображения хоста.
 * @param url Полный URL.
 * @returns Хост без `http://` или `https://`.
 */
export function publicHostLabel(url: string): string {
  return url.replace(/^https?:\/\//, "");
}
