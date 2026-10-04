import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getReadyServices } from "@/infrastructure/composition/ApplicationComposer";
import { getCurrentUser } from "@/infrastructure/http/AuthenticationMiddleware";

export const dynamic = "force-dynamic";

/**
 * Публичная главная: обзор системы, роли, методы шифрования и пул простых RSA.
 */
export default async function HomePage() {
  const { administrationService, systemService } = await getReadyServices();
  const [actor, methods, status] = await Promise.all([
    getCurrentUser(),
    administrationService.getAllEncryptionMethods(),
    systemService.getSystemStatus(),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <section className="space-y-3">
        <Badge variant="secondary">Гость видит только обзор</Badge>
        <h1 className="text-3xl font-semibold tracking-tight">Система защиты сообщений</h1>
        <p className="max-w-3xl text-muted-foreground">
          RSA-32768, «Кузнечик» (ГОСТ Р 34.12-2015), Стрибог-512 (ГОСТ Р 34.11-2012), трёхфакторный вход
          (пароль + письмо + TOTP/коды восстановления) и PDF с электронной подписью. Простые для RSA
          приходят из воркера <code>IS-prime-number-generator</code> через Kafka.
        </p>
        <div className="flex flex-wrap gap-2">
          {actor ? (
            <Button asChild>
              <Link href="/workspace">Перейти в систему</Link>
            </Button>
          ) : (
            <>
              <Button asChild>
                <Link href="/login">Войти</Link>
              </Button>
              <Button variant="outline" asChild>
                <a href={status.mail.signupUrl} target="_blank" rel="noreferrer">
                  Завести почту
                </a>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/register">Создать учётную запись</Link>
              </Button>
            </>
          )}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Роли</CardTitle>
            <CardDescription>Гость / пользователь / администратор</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Гость — только эта страница.</p>
            <p>Пользователь — шифрование своих сообщений, свой журнал, расшифровка и PDF только своих записей.</p>
            <p>
              Администратор — то же, плюс методы шифрования, создание учёток, список всех пользователей и журнал всех
              сообщений (включая чужие ключи, расшифровку и PDF).
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Методы шифрования</CardTitle>
            <CardDescription>Включаются администратором</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {methods.map((item) => (
              <div key={item.method} className="flex items-center justify-between">
                <span>{item.method === "RSA" ? "RSA-32768" : "Кузнечик"}</span>
                <Badge variant={item.enabled ? "default" : "secondary"}>{item.enabled ? "включён" : "выключен"}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Пул простых RSA</CardTitle>
            <CardDescription>Каждый ключ шифрования и каждая подпись PDF собираются из новой пары</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Длина модуля: {status.rsa.modulusBitLength} бит</p>
            <p>
              Накоплено {status.kafka.collectedPrimeCount} простых по {status.kafka.expectedPrimeBitLength} бит. На один ключ
              нужны два.
            </p>
            <p>Пока в пуле меньше двух простых, доступен только «Кузнечик».</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
