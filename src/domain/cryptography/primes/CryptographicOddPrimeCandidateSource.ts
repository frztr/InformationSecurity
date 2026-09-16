import type { RandomIntegerSource } from "@/domain/cryptography/primes/RandomIntegerSource";

/**
 * Случайный нечётный кандидат ровно заданной битовой длины со старшим битом 1.
 */
export class CryptographicOddPrimeCandidateSource {
  public constructor(private readonly randomIntegerSource: RandomIntegerSource) {}

  public nextOddCandidate(bitLength: number): bigint {
    if (bitLength < 2) {
      throw new Error("Битовая длина должна быть не меньше 2.");
    }

    const byteCount = Math.ceil(bitLength / 8);
    const randomBytes = new Uint8Array(byteCount);
    this.randomIntegerSource.fillBytes(randomBytes);

    let candidate = 0n;
    for (const byte of randomBytes) {
      candidate = (candidate << 8n) | BigInt(byte);
    }

    const bitMask = (1n << BigInt(bitLength)) - 1n;
    candidate &= bitMask;
    candidate |= 1n << BigInt(bitLength - 1);
    candidate |= 1n;
    return candidate;
  }
}
