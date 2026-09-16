import { createHash, randomBytes } from "node:crypto";

export function hashOpaqueSecret(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function generateDecimalOtp(digitCount: number): string {
  const max = 10 ** digitCount;
  const randomValue = randomBytes(4).readUInt32BE(0) % max;
  return randomValue.toString().padStart(digitCount, "0");
}

export function generateRecoveryCode(): string {
  const bytes = randomBytes(6);
  const hex = bytes.toString("hex").toUpperCase();
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`;
}

export function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}
