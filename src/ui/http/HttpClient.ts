/** Ошибка HTTP-запроса с кодом статуса. */
class HttpError extends Error {
  /**
   * @param status HTTP-код или `0`, если запрос не ушёл.
   * @param message Текст ошибки.
   */
  public constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/**
 * Выполняет GET и разбирает JSON-ответ.
 * @param path Путь запроса.
 * @param fallbackError Текст при сбое разбора или сети.
 * @returns Тело ответа.
 */
export async function getJson<T>(path: string, fallbackError = "Ошибка"): Promise<T> {
  return requestJson<T>(path, { method: "GET" }, fallbackError);
}

/**
 * Выполняет POST с JSON-телом и разбирает JSON-ответ.
 * @param path Путь запроса.
 * @param body Тело запроса; при отсутствии отправляется POST без тела.
 * @param fallbackError Текст при сбое разбора или сети.
 * @returns Тело ответа.
 */
export async function postJson<T>(path: string, body?: unknown, fallbackError = "Ошибка"): Promise<T> {
  return requestJson<T>(
    path,
    body === undefined ? { method: "POST" } : { method: "POST", body: JSON.stringify(body) },
    fallbackError,
  );
}

/**
 * Выполняет GET и возвращает двоичное тело вместе с именем файла из `Content-Disposition`.
 * @param path Путь запроса.
 * @param fallbackError Текст при ошибке ответа или сети.
 * @returns Blob и имя файла (или `download`).
 */
export async function getBlob(
  path: string,
  fallbackError = "Ошибка",
): Promise<{ blob: Blob; fileName: string }> {
  const response = await send(path, { method: "GET" }, fallbackError);
  if (!response.ok) {
    throw new HttpError(response.status, await readErrorMessage(response, fallbackError));
  }
  return {
    blob: await response.blob(),
    fileName: readFileName(response.headers.get("Content-Disposition")) ?? "download",
  };
}

/**
 * Инициирует скачивание blob через временную ссылку.
 * @param blob Содержимое файла.
 * @param fileName Имя сохраняемого файла.
 */
export function saveBlobFile(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function requestJson<T>(path: string, init: RequestInit, fallbackError: string): Promise<T> {
  const response = await send(path, init, fallbackError);
  if (!response.ok) {
    throw new HttpError(response.status, await readErrorMessage(response, fallbackError));
  }
  return (await response.json()) as T;
}

async function send(path: string, init: RequestInit, fallbackError: string): Promise<Response> {
  try {
    return await fetch(path, {
      ...init,
      headers: {
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new HttpError(0, fallbackError);
  }
}

async function readErrorMessage(response: Response, fallbackError: string): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error ?? fallbackError;
  } catch {
    return fallbackError;
  }
}

function readFileName(contentDisposition: string | null): string | undefined {
  return contentDisposition?.match(/filename="([^"]+)"/)?.[1];
}
