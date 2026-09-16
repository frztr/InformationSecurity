"use client";

import { Loader2Icon } from "lucide-react";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";

type BusyButtonProps = ComponentProps<typeof Button> & {
  busy?: boolean;
  busyLabel?: string;
};

export function BusyButton({ busy = false, busyLabel, children, disabled, ...props }: BusyButtonProps) {
  return (
    <Button disabled={disabled || busy} aria-busy={busy} {...props}>
      {busy ? <Loader2Icon className="animate-spin" /> : null}
      {busy ? (busyLabel ?? children) : children}
    </Button>
  );
}
