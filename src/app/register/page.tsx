"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BusyButton } from "@/components/site/BusyButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Enrollment = {
  otpAuthUrl: string;
  totpSecretBase32: string;
  recoveryCodes: string[];
  qrDataUrl: string;
};

export default function RegisterPage() {
  const [login, setLogin] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setPending(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, email, password, passwordConfirmation }),
      });
      const payload = (await response.json()) as Enrollment & { error?: string };
      if (!response.ok) {
        toast.error(payload.error ?? "Ошибка регистрации");
        return;
      }
      const qr = payload.qrDataUrl;
      setQrDataUrl(qr);
      setEnrollment(payload);
      toast.success("Учётная запись создана. Сохраните коды восстановления.");
    } catch {
      toast.error("Ошибка регистрации");
    } finally {
      setPending(false);
    }
  }

  if (enrollment) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle>3FA настроена</CardTitle>
            <CardDescription>Привяжите TOTP и сохраните коды. Они больше не покажутся.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {qrDataUrl ? <img src={qrDataUrl} alt="QR TOTP" className="mx-auto rounded-md border" /> : null}
            <p className="break-all font-mono text-xs">{enrollment.totpSecretBase32}</p>
            <ul className="grid grid-cols-2 gap-2 font-mono text-sm">
              {enrollment.recoveryCodes.map((code) => (
                <li key={code} className="rounded bg-muted px-2 py-1">
                  {code}
                </li>
              ))}
            </ul>
            <Button className="w-full" onClick={() => (window.location.href = "/login")}>
              Перейти ко входу
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card aria-busy={pending}>
        <CardHeader>
          <CardTitle>Регистрация</CardTitle>
          <CardDescription>
            Сначала заведите ящик в Mailu (
            <a className="underline" href="http://localhost:8025/admin/user/signup/information-security.org" target="_blank" rel="noreferrer">
              регистрация почты
            </a>
            ), затем логин и пароль этой системы. Адрес только на домене information-security.org.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(event) => void submit(event)}>
            <div className="space-y-2">
              <Label htmlFor="login">Логин</Label>
              <Input
                id="login"
                value={login}
                onChange={(event) => setLogin(event.target.value)}
                placeholder="User_01"
                required
                disabled={pending}
              />
              <p className="text-xs text-muted-foreground">^[A-Za-z][A-Za-z0-9_]{"{3,31}"}$</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Почта</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="ivan@information-security.org"
                required
                disabled={pending}
              />
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
              <p className="text-xs text-muted-foreground">8–128 символов, буква, цифра и спецсимвол</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="passwordConfirmation">Подтверждение</Label>
              <Input
                id="passwordConfirmation"
                type="password"
                value={passwordConfirmation}
                onChange={(event) => setPasswordConfirmation(event.target.value)}
                required
                disabled={pending}
              />
            </div>
            <BusyButton className="w-full" type="submit" busy={pending} busyLabel="Создание…">
              Создать
            </BusyButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
