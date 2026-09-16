import { randomBytes, timingSafeEqual } from "node:crypto";
import { Streebog512Hasher } from "@/domain/cryptography/gost/Streebog512Hasher";
import { parseHexString, toHexString } from "@/domain/cryptography/HexEncoding";
import type { PasswordHash } from "@/domain/identity/PasswordHash";
import type { PasswordHasher } from "@/domain/identity/PasswordHasher";

/**
 * Хэш пароля: Стрибог-512 (ГОСТ Р 34.11-2012) от соли и UTF-8 пароля.
 */
export class StreebogPasswordHasher implements PasswordHasher {
  public constructor(
    private readonly hasher: Streebog512Hasher = new Streebog512Hasher(),
    private readonly saltByteLength: number = 16,
  ) {}

  public async hash(password: string): Promise<PasswordHash> {
    const salt = new Uint8Array(randomBytes(this.saltByteLength));
    return {
      algorithm: "streebog512",
      saltHex: toHexString(salt),
      hashHex: toHexString(this.digest(password, salt)),
    };
  }

  public async verify(password: string, storedHash: PasswordHash): Promise<boolean> {
    try {
      const salt = parseHexString(storedHash.saltHex);
      const expected = Buffer.from(parseHexString(storedHash.hashHex));
      const actual = Buffer.from(this.digest(password, salt));
      if (actual.length !== expected.length) {
        return false;
      }
      return timingSafeEqual(actual, expected);
    } catch {
      return false;
    }
  }

  private digest(password: string, salt: Uint8Array): Uint8Array {
    const passwordBytes = new TextEncoder().encode(password);
    const material = new Uint8Array(salt.length + passwordBytes.length);
    material.set(salt);
    material.set(passwordBytes, salt.length);
    return this.hasher.hashBytes(material);
  }
}
