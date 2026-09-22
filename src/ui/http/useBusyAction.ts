"use client";

import { useCallback, useState } from "react";
import { runBusyAction, type UiActionOptions } from "@/ui/http/runUiAction";

/**
 * Хранит признак выполнения асинхронного действия и запускает его через `runBusyAction`.
 * @returns `pending` и функция `run`.
 */
export function useBusyAction() {
  const [pending, setPending] = useState(false);

  const run = useCallback(async <T,>(action: () => Promise<T>, options?: UiActionOptions<T>) => {
    return runBusyAction(setPending, action, options);
  }, []);

  return { pending, run };
}
