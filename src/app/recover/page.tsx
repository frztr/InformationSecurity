"use client";

import { useState } from "react";
import { confirmPasswordReset, requestPasswordReset } from "@/ui/api/authApi";
import { useBusyAction } from "@/ui/http/useBusyAction";
import { publicHostLabel, useSystemStatus } from "@/ui/useSystemStatus";
import { BusyButton } from "@/components/site/BusyButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

/**
 * Страница сброса пароля: запрос письма и подтверждение новым паролем.
 */
export default function RecoverPage() {
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const requesting = useBusyAction();
  const confirming = useBusyAction();
  const { mail } = useSystemStatus();
  const busy = requesting.pending || confirming.pending;

  async function requestReset(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    await requesting.run(() => requestPasswordReset(email), {
      success: (payload) => payload.message,
    });
  }

  async function confirmReset(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const result = await confirming.run(
      () => confirmPasswordReset({ email, otpCode, resetToken, newPassword }),
      { success: "Пароль обновлён" },
    );
    if (result.ok) {
      window.location.href = "/login";
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle>Восстановление пароля</CardTitle>
          <CardDescription>
            Код придёт в веб-почту
            {mail.webmailUrl ? (
              <>
                {" "}
                <a className="underline" href={mail.webmailUrl} target="_blank" rel="noreferrer">
                  {publicHostLabel(mail.webmailUrl)}
                </a>
              </>
            ) : null}
            {mail.domain ? ` на ваш ящик @${mail.domain}` : null}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form className="space-y-3" onSubmit={(event) => void requestReset(event)} aria-busy={requesting.pending}>
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
            <BusyButton type="submit" variant="outline" busy={requesting.pending} busyLabel="Отправка…" disabled={busy}>
              Запросить письмо
            </BusyButton>
          </form>
          <Separator />
          <form className="space-y-3" onSubmit={(event) => void confirmReset(event)} aria-busy={confirming.pending}>
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
            <BusyButton type="submit" busy={confirming.pending} busyLabel="Смена пароля…" disabled={busy}>
              Сменить пароль
            </BusyButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
