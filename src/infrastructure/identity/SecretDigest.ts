import { Streebog512Hasher } from "@/domain/cryptography/gost/Streebog512Hasher";
import { CryptographicRandomIntegerSource } from "@/domain/cryptography/primes/CryptographicRandomIntegerSource";
import { toHexString } from "@/domain/cryptography/HexEncoding";

const streebog = new Streebog512Hasher();
const randomIntegerSource = new CryptographicRandomIntegerSource();

/**
 * Хэширует непрозрачный секрет Стрибог-512 (UTF-8 → hex).
 * @param value Исходная строка.
 * @returns Hex-дайджест.
 */
export function hashOpaqueSecret(value: string): string {
  return streebog.hashUtf8ToHex(value);
}

/**
 * Генерирует десятичный одноразовый код заданной длины.
 * @param digitCount Число цифр.
 * @returns Код с ведущими нулями.
 */
export function generateDecimalOtp(digitCount: number): string {
  const max = 10 ** digitCount;
  const randomValue = Number(randomIntegerSource.nextInclusive(0n, BigInt(max - 1)));
  return randomValue.toString().padStart(digitCount, "0");
}

/**
 * Генерирует код восстановления вида XXXX-XXXX-XXXX из 6 случайных байт.
 * @returns Код восстановления.
 */
export function generateRecoveryCode(): string {
  const hex = toHexString(randomIntegerSource.nextBytes(6)).toUpperCase();
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`;
}

/**
 * Генерирует токен сессии: 32 случайных байта в hex.
 * @returns Hex-токен.
 */
export function generateSessionToken(): string {
  return toHexString(randomIntegerSource.nextBytes(32));
}
