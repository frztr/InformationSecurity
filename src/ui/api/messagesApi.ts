import type { EncryptionMethod } from "@/domain/cryptography/EncryptionMethod";
import { toHistoryMessage } from "@/domain/messaging/EncryptedMessageRecord";
import { getBlob, postJson, saveBlobFile } from "@/ui/http/HttpClient";

/** Запись журнала зашифрованного сообщения. */
export type EncryptedMessageDto = ReturnType<typeof toHistoryMessage>;

/**
 * Шифрует текст выбранным методом и сохраняет запись в журнале.
 * @param input Исходный текст и метод шифрования.
 * @returns Созданная запись журнала.
 */
export async function encryptMessage(input: {
  plaintext: string;
  method: EncryptionMethod;
}): Promise<EncryptedMessageDto> {
  const payload = await postJson<{ message?: EncryptedMessageDto }>("/api/messages", input, "Не удалось зашифровать");
  if (!payload.message) {
    throw new Error("Не удалось зашифровать");
  }
  return {
    ...payload.message,
    createdAt: new Date(payload.message.createdAt).toISOString(),
  };
}

/**
 * Расшифровывает запись журнала по идентификатору.
 * @param messageId Идентификатор сообщения.
 * @returns Полученный открытый текст.
 */
export async function decryptMessage(messageId: string): Promise<{ plaintext: string }> {
  const payload = await postJson<{ plaintext?: string }>(
    `/api/messages/${messageId}/decrypt`,
    undefined,
    "Не удалось расшифровать",
  );
  if (payload.plaintext === undefined) {
    throw new Error("Не удалось расшифровать");
  }
  return { plaintext: payload.plaintext };
}

/**
 * Скачивает подписанный PDF по записи журнала.
 * @param messageId Идентификатор сообщения.
 */
export async function downloadMessagePdf(messageId: string): Promise<void> {
  const { blob, fileName } = await getBlob(`/api/messages/${messageId}/pdf`, "PDF недоступен");
  saveBlobFile(blob, fileName === "download" ? `message-${messageId}.pdf` : fileName);
}

/**
 * Текст уведомления о совпадении расшифровки с исходником в журнале.
 * @param stored Исходный текст из записи журнала.
 * @param plaintext Результат расшифрования.
 * @returns Сообщение о совпадении или расхождении.
 */
export function decryptionMatchMessage(stored: string | undefined, plaintext: string): string {
  return stored === plaintext
    ? "Расшифровка совпала с исходником"
    : "Расшифровка не совпала с исходником в журнале";
}
