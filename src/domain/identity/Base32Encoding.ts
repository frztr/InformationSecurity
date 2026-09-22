const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * Кодирует байты в Base32 (алфавит RFC 4648 без дополнения `=`).
 * @param bytes Исходные байты.
 * @returns Строка Base32.
 */
export function encodeBase32(bytes: Uint8Array): string {
  let bitBuffer = 0;
  let bitCount = 0;
  let output = "";

  for (const byte of bytes) {
    bitBuffer = (bitBuffer << 8) | byte;
    bitCount += 8;
    while (bitCount >= 5) {
      const index = (bitBuffer >> (bitCount - 5)) & 31;
      output += BASE32_ALPHABET[index];
      bitCount -= 5;
    }
  }

  if (bitCount > 0) {
    const index = (bitBuffer << (5 - bitCount)) & 31;
    output += BASE32_ALPHABET[index];
  }

  return output;
}

/**
 * Декодирует строку Base32.
 * @param encoded Строка Base32; завершающие `=` игнорируются.
 * @returns Байты.
 */
export function decodeBase32(encoded: string): Uint8Array {
  const normalized = encoded.replace(/=+$/g, "").toUpperCase();
  let bitBuffer = 0;
  let bitCount = 0;
  const bytes: number[] = [];

  for (const character of normalized) {
    const value = BASE32_ALPHABET.indexOf(character);
    if (value < 0) {
      throw new Error("Некорректная Base32-строка.");
    }
    bitBuffer = (bitBuffer << 5) | value;
    bitCount += 5;
    if (bitCount >= 8) {
      bytes.push((bitBuffer >> (bitCount - 8)) & 0xff);
      bitCount -= 8;
    }
  }

  return Uint8Array.from(bytes);
}

/**
 * Собирает URI `otpauth://totp/...` для привязки приложения-аутентификатора.
 * @param issuer Издатель (имя системы).
 * @param accountName Имя учётной записи.
 * @param secretBase32 Секрет TOTP в Base32.
 */
export function buildOtpAuthUrl(issuer: string, accountName: string, secretBase32: string): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedAccount = encodeURIComponent(accountName);
  return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secretBase32}&issuer=${encodedIssuer}&algorithm=STREEBOG512&digits=6&period=30`;
}
