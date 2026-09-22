"use client";

import { toast } from "sonner";

/** Тексты toast при успехе и ошибке асинхронного действия. */
export type UiActionOptions<T> = {
  success?: string | ((result: T) => string);
  error?: string;
};

/** Результат действия: данные при успехе или признак ошибки. */
export type UiActionResult<T> = { ok: true; data: T } | { ok: false };

/**
 * Выполняет действие и показывает toast об успехе или ошибке.
 * @param action Асинхронная операция.
 * @param options Тексты уведомлений.
 * @returns Данные при успехе либо `{ ok: false }`.
 */
async function runUiAction<T>(
  action: () => Promise<T>,
  options?: UiActionOptions<T>,
): Promise<UiActionResult<T>> {
  try {
    const data = await action();
    if (options?.success !== undefined) {
      const message = typeof options.success === "function" ? options.success(data) : options.success;
      if (message) {
        toast.success(message);
      }
    }
    return { ok: true, data };
  } catch (error) {
    toast.error(error instanceof Error ? error.message : (options?.error ?? "Ошибка"));
    return { ok: false };
  }
}

/**
 * Как `runUiAction`, но выставляет признак занятости на время выполнения.
 * @param setBusy Колбэк переключения занятости.
 * @param action Асинхронная операция.
 * @param options Тексты уведомлений.
 * @returns Данные при успехе либо `{ ok: false }`.
 */
export async function runBusyAction<T>(
  setBusy: (busy: boolean) => void,
  action: () => Promise<T>,
  options?: UiActionOptions<T>,
): Promise<UiActionResult<T>> {
  setBusy(true);
  try {
    return await runUiAction(action, options);
  } finally {
    setBusy(false);
  }
}
