"use client";

import { useState } from "react";
import { decryptMessage, downloadMessagePdf } from "@/ui/api/messagesApi";
import { runBusyAction } from "@/ui/http/runUiAction";

/**
 * Действия журнала: расшифрование записи и скачивание подписанного PDF.
 * @returns Состояние занятости и обработчики `decrypt` / `downloadPdf`.
 */
export function useMessageHistoryActions() {
  const [decryptingId, setDecryptingId] = useState<string | null>(null);
  const [pdfId, setPdfId] = useState<string | null>(null);
  const [decryptedById, setDecryptedById] = useState<Record<string, string>>({});

  async function decrypt(messageId: string): Promise<void> {
    const result = await runBusyAction(
      (busy) => setDecryptingId(busy ? messageId : null),
      () => decryptMessage(messageId),
    );
    if (result.ok) {
      setDecryptedById((current) => ({ ...current, [messageId]: result.data.plaintext }));
    }
  }

  async function downloadPdf(messageId: string): Promise<void> {
    await runBusyAction(
      (busy) => setPdfId(busy ? messageId : null),
      () => downloadMessagePdf(messageId),
    );
  }

  return {
    decryptingId,
    pdfId,
    decryptedById,
    cryptoBusy: decryptingId !== null || pdfId !== null,
    decrypt,
    downloadPdf,
  };
}
