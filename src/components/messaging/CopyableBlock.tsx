"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyableBlock({ label, value, wrap = true }: { label: string; value: string; wrap?: boolean }) {
  const [copied, setCopied] = useState(false);

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <Button type="button" size="xs" variant="ghost" onClick={() => void copy()}>
          {copied ? "Скопировано" : "Копировать"}
        </Button>
      </div>
      <pre
        className={
          wrap
            ? "max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted p-2 font-mono text-[11px] leading-4"
            : "max-h-48 overflow-auto whitespace-pre rounded-md bg-muted p-2 font-mono text-[11px] leading-4"
        }
      >
        {value || "—"}
      </pre>
    </div>
  );
}
