"use client";

import Link from "next/link";
import { useState } from "react";
import { loginWithPassword } from "@/ui/api/authApi";
import { useBusyAction } from "@/ui/http/useBusyAction";
import { BusyButton } from "@/components/site/BusyButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Первый фактор входа: логин и пароль, затем переход к коду из письма.
 */
export default function LoginPage() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const { pending, run } = useBusyAction();

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const result = await run(() => loginWithPassword(login, password), {
      success: (payload) => `Код отправлен на ${payload.emailHint}`,
    });
    if (result.ok) {
      window.location.href = result.data.next;
    }
  }

  return (
    <div className="mx-auto flex max-w-md px-4 py-16">
      <Card className="w-full" aria-busy={pending}>
        <CardHeader>
          <CardTitle>Вход · фактор 1</CardTitle>
          <CardDescription>Пароль. Затем код из письма и TOTP.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(event) => void submit(event)}>
            <div className="space-y-2">
              <Label htmlFor="login">Логин</Label>
              <Input id="login" value={login} onChange={(event) => setLogin(event.target.value)} required disabled={pending} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                disabled={pending}
              />
            </div>
            <BusyButton className="w-full" type="submit" busy={pending} busyLabel="Отправка кода…">
              Продолжить
            </BusyButton>
            <p className="text-center text-sm text-muted-foreground">
              <Link href="/recover" className="underline">
                Восстановить пароль
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
