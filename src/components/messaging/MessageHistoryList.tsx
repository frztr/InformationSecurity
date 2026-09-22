"use client";

import type { EncryptionKeyMaterial } from "@/domain/messaging/EncryptionKeyMaterial";
import type { EncryptedMessageDto } from "@/ui/api/messagesApi";
import { CopyableBlock } from "@/components/messaging/CopyableBlock";
import { BusyButton } from "@/components/site/BusyButton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Запись журнала зашифрованного сообщения. */
export type HistoryMessage = EncryptedMessageDto;

type MessageHistoryListProps = {
  messages: HistoryMessage[];
  showUser?: boolean;
  cryptoBusy: boolean;
  decryptingId: string | null;
  pdfId: string | null;
  decryptedById: Record<string, string>;
  onDecrypt: (messageId: string) => void;
  onDownloadPdf: (messageId: string) => void;
};

/**
 * Список записей журнала: исходник, шифртекст, ключи, проверка расшифровки и скачивание PDF.
 * @param props.messages Записи журнала.
 * @param props.showUser Показывать логин автора записи.
 * @param props.cryptoBusy Блокировка кнопок на время криптооперации.
 * @param props.decryptingId Идентификатор записи, которую расшифровывают.
 * @param props.pdfId Идентификатор записи, для которой формируется PDF.
 * @param props.decryptedById Расшифрованный текст по идентификатору записи.
 * @param props.onDecrypt Запрос расшифрования записи.
 * @param props.onDownloadPdf Запрос подписанного PDF.
 */
export function MessageHistoryList({
  messages,
  showUser = false,
  cryptoBusy,
  decryptingId,
  pdfId,
  decryptedById,
  onDecrypt,
  onDownloadPdf,
}: MessageHistoryListProps) {
  if (messages.length === 0) {
    return <p className="text-sm text-muted-foreground">Пока нет записей.</p>;
  }

  return (
    <div className="space-y-4">
      {messages.map((item) => {
        const decrypted = decryptedById[item.id];
        const matchesStored = decrypted !== undefined && decrypted === item.plaintext;
        return (
          <Card key={item.id}>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
              <div className="space-y-1">
                <CardTitle className="text-base">
                  {item.method === "RSA" ? "RSA-32768" : "Кузнечик"}
                  {showUser ? ` · ${item.userLogin}` : ""}
                </CardTitle>
                <p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString("ru-RU")}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {decrypted !== undefined ? (
                  <Badge variant={matchesStored ? "default" : "destructive"}>
                    {matchesStored ? "расшифровка совпала" : "расшифровка не совпала"}
                  </Badge>
                ) : null}
                <BusyButton
                  size="sm"
                  variant="outline"
                  disabled={cryptoBusy}
                  busy={decryptingId === item.id}
                  busyLabel="Расшифрование…"
                  onClick={() => onDecrypt(item.id)}
                >
                  Проверить из шифртекста
                </BusyButton>
                <BusyButton
                  size="sm"
                  variant="outline"
                  disabled={cryptoBusy}
                  busy={pdfId === item.id}
                  busyLabel="PDF…"
                  onClick={() => onDownloadPdf(item.id)}
                >
                  PDF + ЭЦП
                </BusyButton>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <CopyableBlock label="Исходный текст" value={item.plaintext} />
              <CopyableBlock label={`Шифртекст (${item.ciphertextHex.length / 2} байт, hex)`} value={item.ciphertextHex} />
              {decryptingId === item.id ? <Skeleton className="h-16 w-full" /> : null}
              {decrypted !== undefined && !matchesStored ? (
                <CopyableBlock label="Расшифровано из шифртекста (не совпало с исходником)" value={decrypted} />
              ) : null}
              <KeyMaterialBlocks keyMaterial={item.keyMaterial} />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

/**
 * Блоки ключевого материала записи: PEM для RSA либо ключ и IV «Кузнечика».
 * @param props.keyMaterial Ключи записи либо `null`, если они недоступны.
 */
function KeyMaterialBlocks({ keyMaterial }: { keyMaterial: EncryptionKeyMaterial | null }) {
  if (!keyMaterial) {
    return <p className="text-sm text-muted-foreground">Ключи для этой записи недоступны.</p>;
  }
  if (keyMaterial.method === "RSA") {
    return (
      <div className="space-y-3">
        <p className="text-sm font-medium">Ключи RSA-{keyMaterial.modulusBitLength}</p>
        <CopyableBlock label="Публичный ключ" value={keyMaterial.publicKeyPem} wrap={false} />
        <CopyableBlock label="Секретный ключ" value={keyMaterial.privateKeyPem} wrap={false} />
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Ключи «Кузнечика» (ГОСТ Р 34.12-2015, CBC)</p>
      <CopyableBlock label="Ключ (256 бит, hex)" value={keyMaterial.keyHex} />
      <CopyableBlock label="Вектор инициализации IV (hex)" value={keyMaterial.ivHex} />
    </div>
  );
}
