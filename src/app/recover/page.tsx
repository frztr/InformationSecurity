"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BusyButton } from "@/components/site/BusyButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function RecoverPage() {
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const busy = requesting || confirming;

  async function requestReset(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setRequesting(true);
    try {
      const response = await fetch("/api/auth/recover/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = (await response.json()) as { message?: string };
      toast.success(payload.message ?? "Письмо отправлено, если адрес существует.");
    } catch {
      toast.error("Не удалось отправить письмо");
    } finally {
      setRequesting(false);
    }
  }

  async function confirmReset(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setConfirming(true);
    try {
      const response = await fetch("/api/auth/recover/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otpCode, resetToken, newPassword }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast.error(payload.error ?? "Ошибка");
        return;
      }
      toast.success("Пароль обновлён");
      window.location.href = "/login";
    } catch {
      toast.error("Ошибка");
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle>Восстановление пароля</CardTitle>
          <CardDescription>
            Код придёт в веб-почту{" "}
            <a className="underline" href="http://localhost:8025/webmail" target="_blank" rel="noreferrer">
              localhost:8025/webmail
            </a>{" "}
            на ваш ящик @information-security.org.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form className="space-y-3" onSubmit={(event) => void requestReset(event)} aria-busy={requesting}>
            <div className="space-y-2">
              <Label htmlFor="email">Почта</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={busy}
              />
            </div>
            <BusyButton type="submit" variant="outline" busy={requesting} busyLabel="Отправка…" disabled={busy}>
              Запросить письмо
            </BusyButton>
          </form>
          <Separator />
          <form className="space-y-3" onSubmit={(event) => void confirmReset(event)} aria-busy={confirming}>
            <div className="space-y-2">
              <Label htmlFor="otp">Код из письма</Label>
              <Input id="otp" value={otpCode} onChange={(event) => setOtpCode(event.target.value)} required disabled={busy} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="token">Токен сброса</Label>
              <Input id="token" value={resetToken} onChange={(event) => setResetToken(event.target.value)} required disabled={busy} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Новый пароль</Label>
              <Input
                id="password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
                disabled={busy}
              />
            </div>
            <BusyButton type="submit" busy={confirming} busyLabel="Смена пароля…" disabled={busy}>
              Сменить пароль
            </BusyButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
