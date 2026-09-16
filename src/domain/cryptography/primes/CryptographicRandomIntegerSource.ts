import type { RandomIntegerSource } from "@/domain/cryptography/primes/RandomIntegerSource";
import { randomFillSync } from "node:crypto";

/**
 * Криптографически стойкий источник случайных целых чисел (аналог C# RandomNumberGenerator).
 */
export class CryptographicRandomIntegerSource implements RandomIntegerSource {
  public fillBytes(buffer: Uint8Array): void {
    randomFillSync(buffer);
  }

  public nextInclusive(inclusiveMinimum: bigint, inclusiveMaximum: bigint): bigint {
    if (inclusiveMaximum < inclusiveMinimum) {
      throw new Error("Верхняя граница включительно должна быть не меньше нижней.");
    }

    const rangeSize = inclusiveMaximum - inclusiveMinimum + 1n;
    const randomOffset = this.nextExclusiveUpperBound(rangeSize);
    return inclusiveMinimum + randomOffset;
  }

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
