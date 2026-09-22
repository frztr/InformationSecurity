import { Streebog512Hasher } from "@/domain/cryptography/gost/Streebog512Hasher";
import type { IRandomIntegerSource } from "@/domain/cryptography/primes/IRandomIntegerSource";
import { CryptographicRandomIntegerSource } from "@/domain/cryptography/primes/CryptographicRandomIntegerSource";
import { parseHexString, toHexString } from "@/domain/cryptography/HexEncoding";
import type { PasswordHash } from "@/domain/identity/PasswordHash";
import type { IPasswordHasher } from "@/domain/identity/IPasswordHasher";

/**
 * Реализация IPasswordHasher: Стрибог-512 (ГОСТ Р 34.11-2012) от соли и UTF-8 пароля.
 */
export class StreebogPasswordHasher implements IPasswordHasher {
  public constructor(
    private readonly randomIntegerSource: IRandomIntegerSource = new CryptographicRandomIntegerSource(),
    private readonly hasher: Streebog512Hasher = new Streebog512Hasher(),
    private readonly saltByteLength: number = 16,
  ) {}

  /**
   * Строит случайную соль и хэш пароля.
   * @param password Открытый пароль.
   * @returns Алгоритм, соль и хэш в hex.
   */
  public async hash(password: string): Promise<PasswordHash> {
    const salt = this.randomIntegerSource.nextBytes(this.saltByteLength);
    return {
      algorithm: "streebog512",
      saltHex: toHexString(salt),
      hashHex: toHexString(this.digest(password, salt)),
    };
  }

  /**
   * Сверяет пароль с сохранённым хэшем за постоянное время. При некорректном hex возвращает false.
   * @param password Предъявленный пароль.
   * @param storedHash Сохранённые соль и хэш.
   * @returns true, если хэши совпали.
   */
  public async verify(password: string, storedHash: PasswordHash): Promise<boolean> {
    try {
      const expected = parseHexString(storedHash.hashHex);
      const actual = this.digest(password, parseHexString(storedHash.saltHex));
      return constantTimeEquals(actual, expected);
    } catch {
      return false;
    }
  }

  /**
   * Считает Стрибог-512 от конкатенации соли и UTF-8 пароля.
   * @param password Открытый пароль.
   * @param salt Соль.
   */
  private digest(password: string, salt: Uint8Array): Uint8Array {
    const passwordBytes = new TextEncoder().encode(password);
    const material = new Uint8Array(salt.length + passwordBytes.length);
    material.set(salt);
    material.set(passwordBytes, salt.length);
    return this.hasher.hashBytes(material);
  }
}

function constantTimeEquals(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) {
    return false;
  }
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}
