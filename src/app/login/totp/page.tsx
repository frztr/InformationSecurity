"use client";

import { useState } from "react";
import { verifyThirdFactor } from "@/ui/api/authApi";
import { useBusyAction } from "@/ui/http/useBusyAction";
import { BusyButton } from "@/components/site/BusyButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Третий фактор входа: TOTP или код восстановления. Требует незавершённый вход.
 */
export default function LoginTotpPage() {
  const [code, setCode] = useState("");
  const { pending, run } = useBusyAction();

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const result = await run(() => verifyThirdFactor(code));
    if (result.ok) {
      window.location.href = result.data.next;
    }
  }

  return (
    <div className="mx-auto flex max-w-md px-4 py-16">
      <Card className="w-full" aria-busy={pending}>
        <CardHeader>
          <CardTitle>Вход · фактор 3</CardTitle>
          <CardDescription>
            Шестизначный TOTP на HMAC-Стрибог-512 или одноразовый код восстановления. Google Authenticator с SHA-1 этот код не посчитает.
          </CardDescription>
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
