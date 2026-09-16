"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { BusyButton } from "@/components/site/BusyButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setPending(true);
    try {
      const response = await fetch("/api/auth/login/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password }),
      });
      const payload = (await response.json()) as { error?: string; next?: string; emailHint?: string };
      if (!response.ok) {
        toast.error(payload.error ?? "Ошибка входа");
        return;
      }
      toast.success(`Код отправлен на ${payload.emailHint}`);
      window.location.href = payload.next ?? "/login/email";
    } catch {
      toast.error("Ошибка входа");
    } finally {
      setPending(false);
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
