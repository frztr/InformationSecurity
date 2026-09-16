"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { EncryptionMethod } from "@/domain/cryptography/EncryptionMethod";
import type { HistoryMessage } from "@/components/messaging/MessageHistoryList";
import { MessageHistoryList } from "@/components/messaging/MessageHistoryList";
import { BusyButton } from "@/components/site/BusyButton";
import { cryptoWaitMessage, OperationStatus } from "@/components/site/OperationStatus";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type WorkspaceClientProps = {
  actorLogin: string;
  methods: Array<{ method: EncryptionMethod; enabled: boolean }>;
  messages: HistoryMessage[];
  rsaReady: boolean;
};

export function WorkspaceClient({ actorLogin, methods, messages, rsaReady }: WorkspaceClientProps) {
  const [plaintext, setPlaintext] = useState("");
  const enabledMethods = methods.filter((item) => item.enabled);
  const [method, setMethod] = useState<EncryptionMethod>(
    rsaReady && enabledMethods.some((item) => item.method === "RSA")
      ? "RSA"
      : (enabledMethods[0]?.method ?? "KUZNYECHIK"),
  );
  const [history, setHistory] = useState(messages);
  const [pending, setPending] = useState(false);
  const [decryptingId, setDecryptingId] = useState<string | null>(null);
  const [pdfId, setPdfId] = useState<string | null>(null);
  const [decryptedById, setDecryptedById] = useState<Record<string, string>>({});
  const cryptoBusy = pending || decryptingId !== null || pdfId !== null;
  const decryptingMessage = history.find((item) => item.id === decryptingId);
  const pdfMessage = history.find((item) => item.id === pdfId);

  async function encrypt(): Promise<void> {
    setPending(true);
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plaintext, method }),
      });
      const payload = (await response.json()) as { error?: string; message?: HistoryMessage };
      if (!response.ok || !payload.message) {
        toast.error(payload.error ?? "Не удалось зашифровать");
        return;
      }
      setHistory((current) => [
        {
          ...payload.message!,
          createdAt: new Date(payload.message!.createdAt).toISOString(),
        },
        ...current,
      ]);
      setPlaintext("");
      toast.success("Сообщение зашифровано и сохранено");
    } catch {
      toast.error("Не удалось зашифровать");
    } finally {
      setPending(false);
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
      const stored = history.find((item) => item.id === messageId)?.plaintext;
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
        const payload = (await response.json()) as { error?: string };
        toast.error(payload.error ?? "PDF недоступен");
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
      toast.error("PDF недоступен");
    } finally {
      setPdfId(null);
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
      <Card aria-busy={pending}>
        <CardHeader>
          <CardTitle>Зашифровать сообщение</CardTitle>
          <CardDescription>Доступны только методы, включённые администратором.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pending ? <OperationStatus>{cryptoWaitMessage("encrypt", method)}</OperationStatus> : null}
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
            busy={pending}
            busyLabel="Шифрование…"
          >
            Зашифровать
          </BusyButton>
        </CardContent>
      </Card>
      <Card aria-busy={decryptingId !== null || pdfId !== null}>
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
