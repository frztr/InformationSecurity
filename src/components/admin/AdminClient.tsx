"use client";

import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import type { EncryptionMethod } from "@/domain/cryptography/EncryptionMethod";
import type { UserRole } from "@/domain/identity/UserRole";
import type { HistoryMessage } from "@/components/messaging/MessageHistoryList";
import { MessageHistoryList } from "@/components/messaging/MessageHistoryList";
import { useMessageHistoryActions } from "@/components/messaging/useMessageHistoryActions";
import { BusyButton } from "@/components/site/BusyButton";
import { cryptoWaitMessage, OperationStatus } from "@/components/site/OperationStatus";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createUserAccount, setEncryptionMethodEnabled } from "@/ui/api/adminApi";
import { runBusyAction } from "@/ui/http/runUiAction";
import { useBusyAction } from "@/ui/http/useBusyAction";

type AdminClientProps = {
  methods: Array<{ method: EncryptionMethod; enabled: boolean }>;
  users: Array<{ id: string; login: string; email: string; role: UserRole; createdAt: string }>;
  messages: HistoryMessage[];
};

/**
 * Панель администратора: методы шифрования, создание учётных записей, список пользователей и общий журнал.
 * @param props.methods Методы шифрования и их текущая доступность.
 * @param props.users Список учётных записей.
 * @param props.messages Журнал сообщений всех пользователей.
 */
export function AdminClient({ methods, users, messages }: AdminClientProps) {
  const [methodStates, setMethodStates] = useState(methods);
  const [login, setLogin] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("USER");
  const [createdSecrets, setCreatedSecrets] = useState<string[] | null>(null);
  const [togglingMethod, setTogglingMethod] = useState<EncryptionMethod | null>(null);
  const creatingUser = useBusyAction();
  const historyActions = useMessageHistoryActions();
  const decryptingMessage = messages.find((item) => item.id === historyActions.decryptingId);
  const pdfMessage = messages.find((item) => item.id === historyActions.pdfId);

  async function toggleMethod(method: EncryptionMethod, enabled: boolean): Promise<void> {
    const result = await runBusyAction(
      (busy) => setTogglingMethod(busy ? method : null),
      () => setEncryptionMethodEnabled(method, enabled),
    );
    if (result.ok) {
      setMethodStates((current) => current.map((item) => (item.method === method ? { ...item, enabled } : item)));
    }
  }

  async function createUser(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const result = await creatingUser.run(
      () => createUserAccount({ login, email, password, role }),
      { success: "Пользователь создан" },
    );
    if (result.ok) {
      setCreatedSecrets(result.data.recoveryCodes);
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
      <Card aria-busy={creatingUser.pending}>
        <CardHeader>
          <CardTitle>Создать пользователя</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => void createUser(event)}>
            <div className="space-y-2">
              <Label htmlFor="login">Логин</Label>
              <Input id="login" value={login} onChange={(event) => setLogin(event.target.value)} required disabled={creatingUser.pending} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Почта</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={creatingUser.pending}
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
                disabled={creatingUser.pending}
              />
            </div>
            <div className="space-y-2">
              <Label>Роль</Label>
              <Select value={role} onValueChange={(value) => setRole(value as UserRole)} disabled={creatingUser.pending}>
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
              <BusyButton type="submit" busy={creatingUser.pending} busyLabel="Создание…">
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
      <Card aria-busy={historyActions.cryptoBusy}>
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
            cryptoBusy={historyActions.cryptoBusy}
            decryptingId={historyActions.decryptingId}
            pdfId={historyActions.pdfId}
            decryptedById={historyActions.decryptedById}
            onDecrypt={(messageId) => void historyActions.decrypt(messageId)}
            onDownloadPdf={(messageId) => void historyActions.downloadPdf(messageId)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
