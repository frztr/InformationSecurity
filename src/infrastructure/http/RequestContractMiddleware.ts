import { NextResponse } from "next/server";
import { ContractValidationError } from "@/infrastructure/http/ContractValidation";
import type { HttpContext, HttpHandler } from "@/infrastructure/http/HttpPipeline";

type InputContract<T> = new (input: unknown) => T;

function readContract<T>(Contract: InputContract<T>, input: unknown): T | Response {
  try {
    return new Contract(input);
  } catch (error) {
    if (error instanceof ContractValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}

/**
 * Разбирает JSON-тело в экземпляр контракта; 400 при невалидном JSON или ContractValidationError.
 * @param Contract Класс контракта.
 * @returns Middleware, добавляющий body в контекст.
 */
export function jsonBody<TBody>(Contract: InputContract<TBody>) {
  return <TIn extends HttpContext>(handler: HttpHandler<TIn & { body: TBody }>): HttpHandler<TIn> =>
    async (context) => {
      let raw: unknown;
      try {
        raw = await context.request.json();
      } catch {
        return NextResponse.json({ error: "Некорректное тело запроса." }, { status: 400 });
      }

      const body = readContract(Contract, raw);
      if (body instanceof Response) {
        return body;
      }

      return handler({ ...context, body });
    };
}

/**
 * Разбирает params маршрута в экземпляр контракта; 400 при ContractValidationError.
 * @param Contract Класс контракта.
 * @returns Middleware, добавляющий routeParams в контекст.
 */
export function routeParams<TParams>(Contract: InputContract<TParams>) {
  return <TIn extends HttpContext>(handler: HttpHandler<TIn & { routeParams: TParams }>): HttpHandler<TIn> =>
    async (context) => {
      const routeParamsValue = readContract(Contract, await context.params);
      if (routeParamsValue instanceof Response) {
        return routeParamsValue;
      }

      return handler({ ...context, routeParams: routeParamsValue });
    };
}
