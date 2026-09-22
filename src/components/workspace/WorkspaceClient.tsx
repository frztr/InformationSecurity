"use client";

import { useState } from "react";
import type { EncryptionMethod } from "@/domain/cryptography/EncryptionMethod";
import type { HistoryMessage } from "@/components/messaging/MessageHistoryList";
import { MessageHistoryList } from "@/components/messaging/MessageHistoryList";
import { useMessageHistoryActions } from "@/components/messaging/useMessageHistoryActions";
import { BusyButton } from "@/components/site/BusyButton";
import { cryptoWaitMessage, OperationStatus } from "@/components/site/OperationStatus";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { encryptMessage } from "@/ui/api/messagesApi";
import { useBusyAction } from "@/ui/http/useBusyAction";

type WorkspaceClientProps = {
  actorLogin: string;
  methods: Array<{ method: EncryptionMethod; enabled: boolean }>;
  messages: HistoryMessage[];
  rsaReady: boolean;
};

/**
 * Рабочий стол пользователя: шифрование текста выбранным методом и журнал своих сообщений.
 * @param props.actorLogin Логин текущего пользователя.
 * @param props.methods Список методов шифрования и их доступность.
 * @param props.messages Начальный журнал сообщений.
 * @param props.rsaReady Признак готовности ключей RSA.
 */
export function WorkspaceClient({ actorLogin, methods, messages, rsaReady }: WorkspaceClientProps) {
  const [plaintext, setPlaintext] = useState("");
  const enabledMethods = methods.filter((item) => item.enabled);
  const [method, setMethod] = useState<EncryptionMethod>(
    rsaReady && enabledMethods.some((item) => item.method === "RSA")
      ? "RSA"
      : (enabledMethods[0]?.method ?? "KUZNYECHIK"),
  );
  const [history, setHistory] = useState(messages);
  const encrypting = useBusyAction();
  const historyActions = useMessageHistoryActions(history);
  const cryptoBusy = encrypting.pending || historyActions.cryptoBusy;
  const decryptingMessage = history.find((item) => item.id === historyActions.decryptingId);
  const pdfMessage = history.find((item) => item.id === historyActions.pdfId);

  async function encrypt(): Promise<void> {
    const result = await encrypting.run(() => encryptMessage({ plaintext, method }), {
      success: "Сообщение зашифровано и сохранено",
    });
    if (result.ok) {
      setHistory((current) => [result.data, ...current]);
      setPlaintext("");
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold">Рабочий стол</h1>
        <p className="text-sm text-muted-foreground">
          Пользователь {actorLogin}. RSA-32768 {rsaReady ? "готова (ключи собраны из Kafka)" : "ожидает 16384-битные простые из Kafka"}.
        </p>
      </div>
      <Card aria-busy={encrypting.pending}>
        <CardHeader>
          <CardTitle>Зашифровать сообщение</CardTitle>
          <CardDescription>Доступны только методы, включённые администратором.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {encrypting.pending ? <OperationStatus>{cryptoWaitMessage("encrypt", method)}</OperationStatus> : null}
          <div className="space-y-2">
            <Label htmlFor="plaintext">Исходный текст</Label>
            <Textarea
              id="plaintext"
              value={plaintext}
              onChange={(event) => setPlaintext(event.target.value)}
              rows={6}
              disabled={cryptoBusy}
            />
          </div>
          <div className="space-y-2">
            <Label>Метод</Label>
            <Select value={method} onValueChange={(value) => setMethod(value as EncryptionMethod)} disabled={cryptoBusy}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {enabledMethods.map((item) => (
                  <SelectItem key={item.method} value={item.method} disabled={item.method === "RSA" && !rsaReady}>
                    {item.method === "RSA" ? "RSA-32768" : "Кузнечик"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <BusyButton
            onClick={() => void encrypt()}
            disabled={cryptoBusy || enabledMethods.length === 0}
            busy={encrypting.pending}
            busyLabel="Шифрование…"
          >
            Зашифровать
          </BusyButton>
        </CardContent>
      </Card>
      <Card aria-busy={historyActions.decryptingId !== null || historyActions.pdfId !== null}>
        <CardHeader>
          <CardTitle>Журнал</CardTitle>
          <CardDescription>
            Для проверки алгоритма в каждой записи лежат исходный текст, шифртекст и ключи, которыми шифровали.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {decryptingMessage ? (
            <OperationStatus>{cryptoWaitMessage("decrypt", decryptingMessage.method)}</OperationStatus>
          ) : null}
          {pdfMessage ? <OperationStatus>{cryptoWaitMessage("pdf", pdfMessage.method)}</OperationStatus> : null}
          <MessageHistoryList
            messages={history}
            cryptoBusy={cryptoBusy}
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
