"use client";

import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { EncryptionMethod } from "@/domain/cryptography/EncryptionMethod";
import type { UserRole } from "@/domain/identity/UserRole";
import type { HistoryMessage } from "@/components/messaging/MessageHistoryList";
import { MessageHistoryList } from "@/components/messaging/MessageHistoryList";
import { BusyButton } from "@/components/site/BusyButton";
import { cryptoWaitMessage, OperationStatus } from "@/components/site/OperationStatus";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type AdminClientProps = {
  methods: Array<{ method: EncryptionMethod; enabled: boolean }>;
  users: Array<{ id: string; login: string; email: string; role: UserRole; createdAt: string }>;
  messages: HistoryMessage[];
};

export function AdminClient({ methods, users, messages }: AdminClientProps) {
  const [methodStates, setMethodStates] = useState(methods);
  const [login, setLogin] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("USER");
  const [createdSecrets, setCreatedSecrets] = useState<string[] | null>(null);
  const [creatingUser, setCreatingUser] = useState(false);
  const [togglingMethod, setTogglingMethod] = useState<EncryptionMethod | null>(null);
  const [decryptingId, setDecryptingId] = useState<string | null>(null);
  const [pdfId, setPdfId] = useState<string | null>(null);
  const [decryptedById, setDecryptedById] = useState<Record<string, string>>({});
  const cryptoBusy = decryptingId !== null || pdfId !== null;
  const decryptingMessage = messages.find((item) => item.id === decryptingId);
  const pdfMessage = messages.find((item) => item.id === pdfId);

  async function toggleMethod(method: EncryptionMethod, enabled: boolean): Promise<void> {
    setTogglingMethod(method);
    try {
      const response = await fetch("/api/admin/methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method, enabled }),
      });
      if (!response.ok) {
        toast.error("Не удалось изменить метод");
        return;
      }
      setMethodStates((current) => current.map((item) => (item.method === method ? { ...item, enabled } : item)));
    } catch {
      toast.error("Не удалось изменить метод");
    } finally {
      setTogglingMethod(null);
    }
  }

  async function createUser(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setCreatingUser(true);
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login,
          email,
          password,
          passwordConfirmation: password,
          role,
        }),
      });
      const payload = (await response.json()) as { error?: string; recoveryCodes?: string[] };
      if (!response.ok) {
        toast.error(payload.error ?? "Ошибка");
        return;
      }
      setCreatedSecrets(payload.recoveryCodes ?? []);
      toast.success("Пользователь создан");
    } catch {
      toast.error("Ошибка");
    } finally {
      setCreatingUser(false);
    }
  }

  async function decrypt(messageId: string): Promise<void> {
    setDecryptingId(messageId);
    try {
      const response = await fetch(`/api/messages/${messageId}/decrypt`, { method: "POST" });
      const payload = (await response.json()) as { error?: string; plaintext?: string };
      if (!response.ok || payload.plaintext === undefined) {
        toast.error(payload.error ?? "Не удалось расшифровать");
        return;
      }
      setDecryptedById((current) => ({ ...current, [messageId]: payload.plaintext as string }));
      const stored = messages.find((item) => item.id === messageId)?.plaintext;
      toast.success(
        stored === payload.plaintext ? "Расшифровка совпала с исходником" : "Расшифровка не совпала с исходником в журнале",
      );
    } catch {
      toast.error("Не удалось расшифровать");
    } finally {
      setDecryptingId(null);
    }
  }

  async function downloadPdf(messageId: string): Promise<void> {
    setPdfId(messageId);
    try {
      const response = await fetch(`/api/messages/${messageId}/pdf`);
      if (!response.ok) {
        toast.error("PDF недоступен, пока не готовы ключи RSA");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `message-${messageId}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("PDF недоступен, пока не готовы ключи RSA");
    } finally {
      setPdfId(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">Администрирование</h1>
      <Card>
        <CardHeader>
          <CardTitle>Доступ администратора</CardTitle>
          <CardDescription>Это роль приложения, не панель Mailu.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Включать и выключать RSA-32768 и «Кузнечик» для всех пользователей.</p>
          <p>Создавать учётки с ролью пользователь или администратор, видеть список всех логинов.</p>
          <p>Читать журнал всех сообщений: исходник, шифртекст и ключи любого пользователя.</p>
          <p>Расшифровывать чужие записи и скачивать по ним подписанный PDF.</p>
          <p>Обычный пользователь этого раздела не видит и работает только со своими сообщениями на рабочем месте.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Методы шифрования</CardTitle>
          <CardDescription>Пользователь видит только включённые методы.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {methodStates.map((item) => (
            <label key={item.method} className="flex items-center gap-3 text-sm">
              <Checkbox
                checked={item.enabled}
                disabled={togglingMethod !== null}
                onCheckedChange={(checked) => void toggleMethod(item.method, Boolean(checked))}
              />
              {item.method === "RSA" ? "RSA-32768" : "Кузнечик (ГОСТ)"}
              {togglingMethod === item.method ? <Loader2Icon className="size-4 animate-spin" /> : null}
            </label>
          ))}
        </CardContent>
      </Card>
      <Card aria-busy={creatingUser}>
        <CardHeader>
          <CardTitle>Создать пользователя</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => void createUser(event)}>
            <div className="space-y-2">
              <Label htmlFor="login">Логин</Label>
              <Input id="login" value={login} onChange={(event) => setLogin(event.target.value)} required disabled={creatingUser} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Почта</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={creatingUser}
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
                disabled={creatingUser}
              />
            </div>
            <div className="space-y-2">
              <Label>Роль</Label>
              <Select value={role} onValueChange={(value) => setRole(value as UserRole)} disabled={creatingUser}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">Пользователь</SelectItem>
                  <SelectItem value="ADMIN">Администратор</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <BusyButton type="submit" busy={creatingUser} busyLabel="Создание…">
                Создать
              </BusyButton>
            </div>
          </form>
          {createdSecrets ? (
            <p className="mt-4 font-mono text-xs">Коды восстановления: {createdSecrets.join(", ")}</p>
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Пользователи</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Логин</TableHead>
                <TableHead>Почта</TableHead>
                <TableHead>Роль</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.login}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.role}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card aria-busy={cryptoBusy}>
        <CardHeader>
          <CardTitle>Журнал сообщений</CardTitle>
          <CardDescription>Исходник, шифртекст и ключи — чтобы можно было перепроверить шифрование.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {decryptingMessage ? (
            <OperationStatus>{cryptoWaitMessage("decrypt", decryptingMessage.method)}</OperationStatus>
          ) : null}
          {pdfMessage ? <OperationStatus>{cryptoWaitMessage("pdf", pdfMessage.method)}</OperationStatus> : null}
          <MessageHistoryList
            messages={messages}
            showUser
            cryptoBusy={cryptoBusy}
            decryptingId={decryptingId}
            pdfId={pdfId}
            decryptedById={decryptedById}
            onDecrypt={(messageId) => void decrypt(messageId)}
            onDownloadPdf={(messageId) => void downloadPdf(messageId)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
