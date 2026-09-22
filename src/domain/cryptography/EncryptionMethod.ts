/** Идентификаторы поддерживаемых методов шифрования. */
export const EncryptionMethod = {
  RSA: "RSA",
  KUZNYECHIK: "KUZNYECHIK",
} as const;

/** Идентификатор метода шифрования. */
export type EncryptionMethod = (typeof EncryptionMethod)[keyof typeof EncryptionMethod];

/** Человекочитаемые названия методов шифрования. */
export const ENCRYPTION_METHOD_LABELS: Record<EncryptionMethod, string> = {
  RSA: "RSA-32768",
  KUZNYECHIK: "Кузнечик (ГОСТ Р 34.12-2015)",
};
