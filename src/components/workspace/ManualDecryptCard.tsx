"use client";

import { useEffect, useState } from "react";
import type { EncryptionMethod } from "@/domain/cryptography/EncryptionMethod";
import { CopyableBlock } from "@/components/messaging/CopyableBlock";
import { BusyButton } from "@/components/site/BusyButton";
import { cryptoWaitMessage, OperationStatus } from "@/components/site/OperationStatus";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { decryptPastedCiphertext } from "@/ui/crypto/decryptPastedCiphertext";
import { useBusyAction } from "@/ui/http/useBusyAction";

type ManualDecryptCardProps = {
  methods: Array<{ method: EncryptionMethod; enabled: boolean }>;
  defaultMethod: EncryptionMethod;
  disabled: boolean;
  onPendingChange: (pending: boolean) => void;
};

/**
 * Клиентское расшифрование: шифртекст и ключ вставляются в форму, сервер не вызывается.
 * @param props.methods Методы, включённые администратором.
 * @param props.defaultMethod Метод по умолчанию, как у окна шифрования.
 * @param props.disabled Блокировка на время другой криптооперации.
 * @param props.onPendingChange Сообщает родителю, что идёт клиентское расшифрование.
 */
export function ManualDecryptCard({ methods, defaultMethod, disabled, onPendingChange }: ManualDecryptCardProps) {
  const enabledMethods = methods.filter((item) => item.enabled);
  const [method, setMethod] = useState<EncryptionMethod>(
    enabledMethods.some((item) => item.method === defaultMethod)
      ? defaultMethod
      : (enabledMethods[0]?.method ?? "KUZNYECHIK"),
  );
  const [ciphertextHex, setCiphertextHex] = useState("");
  const [keyText, setKeyText] = useState("");
  const [plaintext, setPlaintext] = useState<string | null>(null);
  const decrypting = useBusyAction();

  useEffect(() => {
    onPendingChange(decrypting.pending);
  }, [decrypting.pending, onPendingChange]);

  async function decrypt(): Promise<void> {
    const result = await decrypting.run(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
      return decryptPastedCiphertext(method, ciphertextHex, keyText);
    });
    if (result.ok) {
      setPlaintext(result.data);
    }
  }

  return (
    <Card aria-busy={decrypting.pending}>
      <CardHeader>
        <CardTitle>Расшифровать</CardTitle>
        <CardDescription>
          Считается в браузере: вставьте шифртекст (hex) и ключ. Для «Кузнечика» IV уже в начале шифртекста.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {decrypting.pending ? <OperationStatus>{cryptoWaitMessage("decrypt", method)}</OperationStatus> : null}
        <div className="space-y-2">
          <Label htmlFor="manual-ciphertext">Шифртекст (hex)</Label>
          <Textarea
            id="manual-ciphertext"
            value={ciphertextHex}
            onChange={(event) => setCiphertextHex(event.target.value)}
            rows={6}
            disabled={disabled || decrypting.pending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="manual-key">{method === "RSA" ? "Секретный ключ (PEM)" : "Ключ (hex, 256 бит)"}</Label>
          <Textarea
            id="manual-key"
            value={keyText}
            onChange={(event) => setKeyText(event.target.value)}
            rows={6}
            disabled={disabled || decrypting.pending}
          />
        </div>
        <div className="space-y-2">
          <Label>Метод</Label>
          <Select
            value={method}
            onValueChange={(value) => setMethod(value as EncryptionMethod)}
            disabled={disabled || decrypting.pending}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {enabledMethods.map((item) => (
                <SelectItem key={item.method} value={item.method}>
                  {item.method === "RSA" ? "RSA-32768" : "Кузнечик"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <BusyButton
          onClick={() => void decrypt()}
          disabled={disabled || decrypting.pending || enabledMethods.length === 0}
          busy={decrypting.pending}
          busyLabel="Расшифрование…"
        >
          Расшифровать
        </BusyButton>
        {plaintext !== null ? <CopyableBlock label="Открытый текст" value={plaintext} /> : null}
      </CardContent>
    </Card>
  );
}
