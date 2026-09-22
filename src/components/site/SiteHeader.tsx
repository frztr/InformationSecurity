"use client";

import Link from "next/link";
import { BusyButton } from "@/components/site/BusyButton";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { logoutSession } from "@/ui/api/authApi";
import { useBusyAction } from "@/ui/http/useBusyAction";
import { useSystemStatus } from "@/ui/useSystemStatus";

/**
 * Шапка сайта: навигация по ролям, ссылка на веб-почту и выход из сессии.
 */
export function SiteHeader() {
  const { ready, actor, mail } = useSystemStatus();
  const loggingOut = useBusyAction();

  async function logout(): Promise<void> {
    const result = await loggingOut.run(() => logoutSession());
    if (result.ok) {
      window.location.href = "/";
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
              {mail.webmailUrl ? (
                <Button variant="ghost" size="sm" asChild>
                  <a href={mail.webmailUrl} target="_blank" rel="noreferrer">
                    Почта
                  </a>
                </Button>
              ) : null}
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Вход</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">Регистрация</Link>
              </Button>
            </>
          ) : (
            <>
              {mail.webmailUrl ? (
                <Button variant="ghost" size="sm" asChild>
                  <a href={mail.webmailUrl} target="_blank" rel="noreferrer">
                    Почта
                  </a>
                </Button>
              ) : null}
              <Button variant="ghost" size="sm" asChild>
                <Link href="/workspace">Рабочий стол</Link>
              </Button>
              {actor.role === "ADMIN" ? (
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/admin">Админ</Link>
                </Button>
              ) : null}
              <span className="px-2 text-sm text-muted-foreground">{actor.login}</span>
              <BusyButton variant="outline" size="sm" busy={loggingOut.pending} busyLabel="Выход…" onClick={() => void logout()}>
                Выйти
              </BusyButton>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
