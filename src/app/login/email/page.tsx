"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BusyButton } from "@/components/site/BusyButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginEmailPage() {
  const [otpCode, setOtpCode] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setPending(true);
    try {
      const response = await fetch("/api/auth/login/email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otpCode }),
      });
      const payload = (await response.json()) as { error?: string; next?: string };
      if (!response.ok) {
        toast.error(payload.error ?? "Ошибка");
        return;
      }
      window.location.href = payload.next ?? "/login/totp";
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
          <CardTitle>Вход · фактор 2</CardTitle>
          <CardDescription>
            Код из письма в веб-почте:{" "}
            <a className="underline" href="http://localhost:8025/webmail" target="_blank" rel="noreferrer">
              localhost:8025/webmail
            </a>
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(event) => void submit(event)}>
            <div className="space-y-2">
              <Label htmlFor="otp">Код из письма</Label>
              <Input
                id="otp"
                inputMode="numeric"
                value={otpCode}
                onChange={(event) => setOtpCode(event.target.value)}
                required
                disabled={pending}
              />
            </div>
            <BusyButton className="w-full" type="submit" busy={pending} busyLabel="Проверка…">
              Подтвердить
            </BusyButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
