import { Loader2Icon } from "lucide-react";
import type { EncryptionMethod } from "@/domain/cryptography/EncryptionMethod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function cryptoWaitMessage(kind: "encrypt" | "decrypt" | "pdf", method: EncryptionMethod): string {
  if (method === "RSA") {
    if (kind === "encrypt") {
      return "RSA-32768: шифрование может занять до минуты. Не закрывайте страницу.";
    }
    if (kind === "decrypt") {
      return "RSA-32768: расшифрование может занять до минуты. Не закрывайте страницу.";
    }
    return "RSA-32768: подпись PDF может занять до минуты. Не закрывайте страницу.";
  }
  if (kind === "encrypt") {
    return "Идёт шифрование…";
  }
  if (kind === "decrypt") {
    return "Идёт расшифрование…";
  }
  return "Формируется подписанный PDF…";
}

export function OperationStatus({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <Alert>
      <Loader2Icon className="animate-spin" />
      <AlertTitle>{title ?? "Идёт обработка"}</AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
