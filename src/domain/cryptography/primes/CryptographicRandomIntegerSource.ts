import { openSync, readSync } from "node:fs";
import type { IRandomIntegerSource } from "@/domain/cryptography/primes/IRandomIntegerSource";

/**
 * Криптографически стойкий источник случайных байт: чтение /dev/urandom.
 */
export class CryptographicRandomIntegerSource implements IRandomIntegerSource {
  private readonly urandomFd = openSync("/dev/urandom", "r");

  /**
   * Заполняет буфер байтами из /dev/urandom.
   * @param buffer Целевой буфер.
   */
  public fillBytes(buffer: Uint8Array): void {
    let offset = 0;
    while (offset < buffer.length) {
      const bytesRead = readSync(this.urandomFd, buffer, offset, buffer.length - offset, null);
      if (bytesRead <= 0) {
        throw new Error("Не удалось прочитать энтропию из /dev/urandom.");
      }
      offset += bytesRead;
    }
  }

  /**
   * Возвращает новый массив из заданного числа случайных байт.
   * @param byteCount Длина массива.
   * @returns Случайные байты.
   */
  public nextBytes(byteCount: number): Uint8Array {
    const bytes = new Uint8Array(byteCount);
    this.fillBytes(bytes);
    return bytes;
  }

  /**
   * Равномерно выбирает целое на закрытом отрезке.
   * @param inclusiveMinimum Нижняя граница включительно.
   * @param inclusiveMaximum Верхняя граница включительно.
   * @returns Случайное целое из [inclusiveMinimum, inclusiveMaximum].
   */
  public nextInclusive(inclusiveMinimum: bigint, inclusiveMaximum: bigint): bigint {
    if (inclusiveMaximum < inclusiveMinimum) {
      throw new Error("Верхняя граница включительно должна быть не меньше нижней.");
    }

    const rangeSize = inclusiveMaximum - inclusiveMinimum + 1n;
    const randomOffset = this.nextExclusiveUpperBound(rangeSize);
    return inclusiveMinimum + randomOffset;
  }

  /**
   * Равномерно выбирает целое из полуинтервала [0, exclusiveUpperBound) методом отклонения.
   * @param exclusiveUpperBound Строго положительная верхняя граница исключительно.
   * @returns Случайное целое, меньшее exclusiveUpperBound.
   */
  private nextExclusiveUpperBound(exclusiveUpperBound: bigint): bigint {
    if (exclusiveUpperBound <= 0n) {
      throw new Error("Верхняя граница исключительно должна быть больше нуля.");
    }

    const bitLength = exclusiveUpperBound.toString(2).length;
    const byteCount = Math.ceil(bitLength / 8);
    const excessBitCount = byteCount * 8 - bitLength;
    const buffer = new Uint8Array(byteCount);

    while (true) {
      this.fillBytes(buffer);
      let candidate = 0n;
      for (const byte of buffer) {
        candidate = (candidate << 8n) | BigInt(byte);
      }
      if (excessBitCount > 0) {
        candidate >>= BigInt(excessBitCount);
      }
      if (candidate < exclusiveUpperBound) {
        return candidate;
      }
    }
  }
}
