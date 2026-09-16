"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BusyButton } from "@/components/site/BusyButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginTotpPage() {
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setPending(true);
    try {
      const response = await fetch("/api/auth/login/third-factor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const payload = (await response.json()) as { error?: string; next?: string };
      if (!response.ok) {
        toast.error(payload.error ?? "Ошибка");
        return;
      }
      window.location.href = payload.next ?? "/workspace";
    } catch {
      toast.error("Ошибка");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md px-4 py-16">
      <Card className="w-full" aria-busy={pending}>
        <CardHeader>
          <CardTitle>Вход · фактор 3</CardTitle>
          <CardDescription>Код из TOTP-приложения или одноразовый код восстановления.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(event) => void submit(event)}>
            <div className="space-y-2">
              <Label htmlFor="code">TOTP / код восстановления</Label>
              <Input id="code" value={code} onChange={(event) => setCode(event.target.value)} required disabled={pending} />
            </div>
            <BusyButton className="w-full" type="submit" busy={pending} busyLabel="Вход…">
              Войти
            </BusyButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
