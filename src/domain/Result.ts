/**
 * Успешный исход операции.
 * @template T Тип полезной нагрузки.
 */
type SuccessResult<T> = {
  isError: false;
  resultDto: T;
};

/**
 * Штатный отказ операции.
 */
type ErrorResult = {
  isError: true;
  error: string;
};

/**
 * Результат доменной операции: либо `resultDto`, либо `error`.
 * @template T Тип полезной нагрузки при успехе.
 */
export type Result<T> = SuccessResult<T> | ErrorResult;

/**
 * Собирает успешный результат.
 * @param resultDto Полезная нагрузка.
 */
export function ok<T>(resultDto: T): Result<T> {
  return { isError: false, resultDto };
}

/**
 * Собирает отказ с текстом ошибки.
 * @param error Описание отказа.
 */
export function fail(error: string): Result<never> {
  return { isError: true, error };
}

/**
 * Выполняет функцию и превращает выброшенное исключение в отказ.
 * @param run Синхронная операция.
 * @param fallback Текст ошибки, если выброшено не `Error`.
 */
export function fromThrowable<T>(run: () => T, fallback: string): Result<T> {
  try {
    return ok(run());
  } catch (error) {
    return fail(error instanceof Error ? error.message : fallback);
  }
}
