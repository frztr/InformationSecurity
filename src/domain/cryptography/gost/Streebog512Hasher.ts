import { PI_SUBSTITUTION } from "@/domain/cryptography/gost/PiSubstitution";
import {
  STREEBOG_BYTE_PERMUTATION_TAU,
  STREEBOG_LINEAR_MATRIX_ROWS,
  STREEBOG_ROUND_CONSTANTS,
} from "@/domain/cryptography/gost/StreebogConstants";

const BLOCK_SIZE_BYTES = 64;
const ROUND_COUNT = 12;

/**
 * Хэш-функция Стрибог-512 (ГОСТ Р 34.11-2012 / RFC 6986).
 * Байты хранятся в порядке RFC: индекс 0 — старший байт 512-битного вектора.
 */
export class Streebog512Hasher {
  public hashBytes(message: Uint8Array): Uint8Array {
    let chainingValue: Uint8Array<ArrayBufferLike> = new Uint8Array(BLOCK_SIZE_BYTES);
    let bitLengthCounter: Uint8Array<ArrayBufferLike> = new Uint8Array(BLOCK_SIZE_BYTES);
    let checksum: Uint8Array<ArrayBufferLike> = new Uint8Array(BLOCK_SIZE_BYTES);

    let remaining: Uint8Array<ArrayBufferLike> = message;

    while (remaining.length >= BLOCK_SIZE_BYTES) {
      const messageBlock = remaining.subarray(remaining.length - BLOCK_SIZE_BYTES);
      remaining = remaining.subarray(0, remaining.length - BLOCK_SIZE_BYTES);
      chainingValue = this.compress(chainingValue, messageBlock, bitLengthCounter);
      bitLengthCounter = this.addInteger(bitLengthCounter, 512n);
      checksum = this.addInteger(checksum, this.bytesToInteger(messageBlock));
    }

    const paddedBlock = new Uint8Array(BLOCK_SIZE_BYTES);
    paddedBlock.set(remaining, BLOCK_SIZE_BYTES - remaining.length);
    if (remaining.length < BLOCK_SIZE_BYTES) {
      paddedBlock[BLOCK_SIZE_BYTES - remaining.length - 1] = 0x01;
    }

    chainingValue = this.compress(chainingValue, paddedBlock, bitLengthCounter);
    bitLengthCounter = this.addInteger(bitLengthCounter, BigInt(remaining.length * 8));
    checksum = this.addInteger(checksum, this.bytesToInteger(paddedBlock));

    const zeroVector = new Uint8Array(BLOCK_SIZE_BYTES);
    chainingValue = this.compress(chainingValue, bitLengthCounter, zeroVector);
    chainingValue = this.compress(chainingValue, checksum, zeroVector);

    return chainingValue;
  }

  public hashUtf8(text: string): Uint8Array {
    return this.hashBytes(new TextEncoder().encode(text));
  }

  public hashToHex(message: Uint8Array): string {
    return Array.from(this.hashBytes(message), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  private compress(chainingValue: Uint8Array, messageBlock: Uint8Array, lengthVector: Uint8Array): Uint8Array {
    const key = this.applyLps(this.exclusiveOr(chainingValue, lengthVector));
    const encrypted = this.encrypt(key, messageBlock);
    return this.exclusiveOr(this.exclusiveOr(encrypted, chainingValue), messageBlock);
  }

  private encrypt(initialKey: Uint8Array, messageBlock: Uint8Array): Uint8Array {
    let key: Uint8Array<ArrayBufferLike> = new Uint8Array(initialKey);
    let state: Uint8Array<ArrayBufferLike> = this.exclusiveOr(messageBlock, key);

    for (let roundIndex = 0; roundIndex < ROUND_COUNT; roundIndex += 1) {
      key = this.applyLps(this.exclusiveOr(key, STREEBOG_ROUND_CONSTANTS[roundIndex]));
      state = this.exclusiveOr(this.applyLps(state), key);
    }

    return state;
  }

  private applyLps(block: Uint8Array): Uint8Array {
    return this.applyLinear(this.applyPermutation(this.applySubstitution(block)));
  }

  private applySubstitution(block: Uint8Array): Uint8Array {
    const substituted = new Uint8Array(BLOCK_SIZE_BYTES);
    for (let index = 0; index < BLOCK_SIZE_BYTES; index += 1) {
      substituted[index] = PI_SUBSTITUTION[block[index]];
    }
    return substituted;
  }

  private applyPermutation(block: Uint8Array): Uint8Array {
    const permuted = new Uint8Array(BLOCK_SIZE_BYTES);
    for (let outputIndex = 0; outputIndex < BLOCK_SIZE_BYTES; outputIndex += 1) {
      const tauIndex = 63 - outputIndex;
      const sourceIndex = 63 - STREEBOG_BYTE_PERMUTATION_TAU[tauIndex];
      permuted[outputIndex] = block[sourceIndex];
    }
    return permuted;
  }

  private applyLinear(block: Uint8Array): Uint8Array {
    const transformed = new Uint8Array(BLOCK_SIZE_BYTES);
    for (let wordIndex = 0; wordIndex < 8; wordIndex += 1) {
      const word = block.subarray(wordIndex * 8, wordIndex * 8 + 8);
      transformed.set(this.applyLinear64(word), wordIndex * 8);
    }
    return transformed;
  }

  private applyLinear64(word: Uint8Array): Uint8Array {
    let result = 0n;
    let matrixRowIndex = 0;
    for (let byteIndex = 0; byteIndex < 8; byteIndex += 1) {
      for (let bitIndex = 7; bitIndex >= 0; bitIndex -= 1) {
        if (((word[byteIndex] >> bitIndex) & 1) !== 0) {
          result ^= STREEBOG_LINEAR_MATRIX_ROWS[matrixRowIndex];
        }
        matrixRowIndex += 1;
      }
    }

    const resultBytes = new Uint8Array(8);
    for (let byteIndex = 0; byteIndex < 8; byteIndex += 1) {
      const shift = BigInt((7 - byteIndex) * 8);
      resultBytes[byteIndex] = Number((result >> shift) & 0xffn);
    }
    return resultBytes;
  }

  private exclusiveOr(left: Uint8Array, right: Uint8Array): Uint8Array {
    const result = new Uint8Array(left.length);
    for (let index = 0; index < left.length; index += 1) {
      result[index] = left[index] ^ right[index];
    }
    return result;
  }

  private bytesToInteger(bytes: Uint8Array): bigint {
    let value = 0n;
    for (const byte of bytes) {
      value = (value << 8n) | BigInt(byte);
    }
    return value;
  }

  private addInteger(left: Uint8Array, right: bigint): Uint8Array {
    const modulus = 1n << 512n;
    const sum = (this.bytesToInteger(left) + (right % modulus)) % modulus;
    const result = new Uint8Array(BLOCK_SIZE_BYTES);
    let remaining = sum;
    for (let index = BLOCK_SIZE_BYTES - 1; index >= 0; index -= 1) {
      result[index] = Number(remaining & 0xffn);
      remaining >>= 8n;
    }
    return result;
  }
}
