import { NextResponse } from "next/server";
import type { Result } from "@/domain/Result";
import type { HttpContext, HttpHandler } from "@/infrastructure/http/HttpPipeline";

/**
 * Оборачивает обработчик: необработанные исключения превращаются в JSON `{ error }` с заданным статусом.
 * @param status HTTP-статус ошибки.
 * @param fallback Текст, если исключение не является Error.
 * @returns Промежуточный обработчик HTTP.
 */
export function catchErrors(status: number, fallback: string) {
  return <TIn extends HttpContext>(handler: HttpHandler<TIn>): HttpHandler<TIn> =>
    async (context) => {
      try {
        return await handler(context);
      } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : fallback },
          { status },
        );
      }
    };
}

/**
 * Преобразует Result в HTTP-ответ: ошибка — JSON `{ error }`, успех — callback.
 * @param result Результат прикладной операции.
 * @param errorStatus HTTP-статус при ошибке.
 * @param onSuccess Построение ответа по DTO.
 * @returns HTTP-ответ.
 */
export function fromResult<T>(result: Result<T>, errorStatus: number, onSuccess: (dto: T) => Response): Response {
  if (result.isError) {
    return NextResponse.json({ error: result.error }, { status: errorStatus });
  }
  return onSuccess(result.resultDto);
}

/**
 * Как {@link fromResult}, но успешный ответ сериализуется в JSON; при `undefined` DTO отдаёт `{ ok: true }`.
 * @param result Результат прикладной операции.
 * @param errorStatus HTTP-статус при ошибке.
 * @param body Необязательное преобразование DTO в тело ответа.
 * @returns HTTP-ответ.
 */
export function jsonFromResult<T>(result: Result<T>, errorStatus: number, body?: (dto: T) => unknown): Response {
  return fromResult(result, errorStatus, (dto) =>
    NextResponse.json(body ? body(dto) : dto === undefined ? { ok: true } : dto),
  );
}
