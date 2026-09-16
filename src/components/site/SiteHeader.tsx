"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BusyButton } from "@/components/site/BusyButton";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type Actor =
  | { role: "GUEST" }
  | { role: "USER" | "ADMIN"; login: string };

const MAIL_FALLBACK = {
  webmailUrl: "http://localhost:8025/webmail",
};

export function SiteHeader() {
  const [actor, setActor] = useState<Actor>({ role: "GUEST" });
  const [webmailUrl, setWebmailUrl] = useState(MAIL_FALLBACK.webmailUrl);
  const [ready, setReady] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    void fetch("/api/system/status")
      .then((response) => response.json())
      .then((payload: { actor?: Actor; mail?: { webmailUrl?: string } }) => {
        if (payload.actor) {
          setActor(payload.actor);
        }
        if (payload.mail?.webmailUrl) {
          setWebmailUrl(payload.mail.webmailUrl);
        }
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);

  async function logout(): Promise<void> {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/";
    } catch {
      setLoggingOut(false);
    }
  }

  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="font-semibold tracking-tight">
          InformationSecurity
        </Link>
        <nav className="flex items-center gap-2">
          {!ready ? (
            <>
              <Skeleton className="h-7 w-16" />
              <Skeleton className="h-7 w-16" />
              <Skeleton className="h-7 w-24" />
            </>
          ) : actor.role === "GUEST" ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <a href={webmailUrl} target="_blank" rel="noreferrer">
                  Почта
                </a>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Вход</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">Регистрация</Link>
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <a href={webmailUrl} target="_blank" rel="noreferrer">
                  Почта
                </a>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/workspace">Рабочий стол</Link>
              </Button>
              {actor.role === "ADMIN" ? (
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/admin">Админ</Link>
                </Button>
              ) : null}
              <span className="px-2 text-sm text-muted-foreground">{actor.login}</span>
              <BusyButton variant="outline" size="sm" busy={loggingOut} busyLabel="Выход…" onClick={() => void logout()}>
                Выйти
              </BusyButton>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
