"use client";

import { useState } from "react";
import { verifyEmailOtp } from "@/ui/api/authApi";
import { useBusyAction } from "@/ui/http/useBusyAction";
import { publicHostLabel, useSystemStatus } from "@/ui/useSystemStatus";
import { BusyButton } from "@/components/site/BusyButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Второй фактор входа: одноразовый код из письма. Требует незавершённый вход.
 */
export default function LoginEmailPage() {
  const [otpCode, setOtpCode] = useState("");
  const { pending, run } = useBusyAction();
  const { mail } = useSystemStatus();

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const result = await run(() => verifyEmailOtp(otpCode));
    if (result.ok) {
      window.location.href = result.data.next;
    }
  }

  return (
    <div className="mx-auto flex max-w-md px-4 py-16">
      <Card className="w-full" aria-busy={pending}>
        <CardHeader>
          <CardTitle>Вход · фактор 2</CardTitle>
          <CardDescription>
            Код из письма в веб-почте
            {mail.webmailUrl ? (
              <>
                :{" "}
                <a className="underline" href={mail.webmailUrl} target="_blank" rel="noreferrer">
                  {publicHostLabel(mail.webmailUrl)}
                </a>
              </>
            ) : null}
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
