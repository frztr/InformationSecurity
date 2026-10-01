import { PI_TABLE } from "@/domain/cryptography/gost/PiSubstitution";
import {
  STREEBOG_LINEAR_MATRIX_TABLE,
  STREEBOG_ROUND_CONSTANTS,
  STREEBOG_TAU_TABLE,
} from "@/domain/cryptography/gost/StreebogConstants";

const BLOCK_SIZE_BYTES = 64;
const ROUND_COUNT = 12;

/**
 * Раундовые константы в нумерации ГОСТ: индекс 0 — младший байт.
 * В таблице стандарта слева стоит старший байт, поэтому блок разворачивается.
 */
const ROUND_CONSTANTS = STREEBOG_ROUND_CONSTANTS.map(reverseBlock);

/**
 * Хэш-функция Стрибог-512 (ГОСТ Р 34.11-2012).
 * Внутри 512-битный вектор хранится как в ГОСТ: индекс 0 — младший байт.
 * Методы hashBytes и hashToHex отдают дайджест в обычной записи: индекс 0 — старший байт.
 */
export class Streebog512Hasher {
  /**
   * Хэширует произвольные байты по ГОСТ Р 34.11-2012 (Стрибог-512).
   * @param message Входное сообщение, первый байт — старший.
   * @returns 64-байтный дайджест, индекс 0 — старший байт.
   */
  public hashBytes(message: Uint8Array): Uint8Array {
    let currentHash: Uint8Array<ArrayBufferLike> = new Uint8Array(BLOCK_SIZE_BYTES);
    let bitLength: Uint8Array<ArrayBufferLike> = new Uint8Array(BLOCK_SIZE_BYTES);
    let checksum: Uint8Array<ArrayBufferLike> = new Uint8Array(BLOCK_SIZE_BYTES);

    let remaining: Uint8Array<ArrayBufferLike> = message;

    while (remaining.length >= BLOCK_SIZE_BYTES) {
      const messageBlock = toGostBlock(remaining.subarray(remaining.length - BLOCK_SIZE_BYTES));
      remaining = remaining.subarray(0, remaining.length - BLOCK_SIZE_BYTES);
      currentHash = this.compress(currentHash, messageBlock, bitLength);
      bitLength = this.addInteger(bitLength, 512n);
      checksum = this.addInteger(checksum, this.bytesToInteger(messageBlock));
    }

    const paddedBlock = toGostBlock(remaining);
    if (remaining.length < BLOCK_SIZE_BYTES) {
      paddedBlock[remaining.length] = 0x01;
    }

    currentHash = this.compress(currentHash, paddedBlock, bitLength);
    bitLength = this.addInteger(bitLength, BigInt(remaining.length * 8));
    checksum = this.addInteger(checksum, this.bytesToInteger(paddedBlock));

    const zeroVector = new Uint8Array(BLOCK_SIZE_BYTES);
    currentHash = this.compress(currentHash, bitLength, zeroVector);
    currentHash = this.compress(currentHash, checksum, zeroVector);

    return reverseBlock(currentHash);
  }

  /**
   * Хэширует UTF-8 представление строки и возвращает шестнадцатеричную запись.
   * @param text Исходный текст.
   * @returns 128 символов hex, слева старший байт.
   */
  public hashUtf8ToHex(text: string): string {
    return this.hashToHex(new TextEncoder().encode(text));
  }

  /**
   * Хэширует байты и возвращает шестнадцатеричную запись дайджеста.
   * @param message Входное сообщение.
   * @returns 128 символов hex, слева старший байт.
   */
  public hashToHex(message: Uint8Array): string {
    return Array.from(this.hashBytes(message), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  /**
   * Функция сжатия g_N(h, m) стандарта.
   * @param currentHash Текущее значение хэширования h.
   * @param messageBlock Блок сообщения m.
   * @param bitLength Вектор N (накопленная длина в битах).
   * @returns Новое значение хэширования.
   */
  private compress(currentHash: Uint8Array, messageBlock: Uint8Array, bitLength: Uint8Array): Uint8Array {
    const key = this.applyLps(this.XTransform(currentHash, bitLength));
    const encrypted = this.encrypt(key, messageBlock);
    return this.XTransform(this.XTransform(encrypted, currentHash), messageBlock);
  }

  /**
   * Преобразование E_K(m): 12 раундов LPS с раундовыми константами.
   * @param initialKey Начальный ключ K.
   * @param messageBlock Блок сообщения.
   * @returns Зашифрованный блок.
   */
  private encrypt(initialKey: Uint8Array, messageBlock: Uint8Array): Uint8Array {
    let key: Uint8Array<ArrayBufferLike> = new Uint8Array(initialKey);
    let state: Uint8Array<ArrayBufferLike> = this.XTransform(messageBlock, key);

    for (let roundIndex = 0; roundIndex < ROUND_COUNT; roundIndex += 1) {
      key = this.applyLps(this.XTransform(key, ROUND_CONSTANTS[roundIndex]));
      state = this.XTransform(this.applyLps(state), key);
    }

    return state;
  }

  /**
   * Композиция LPS: подстановка π, перестановка τ и линейное преобразование L.
   * @param block 64-байтный блок.
   * @returns Преобразованный блок.
   */
  private applyLps(block: Uint8Array): Uint8Array {
    return this.LTransform(this.PTransform(this.STransform(block)));
  }

  /**
   * Применяет нелинейную подстановку π к 64-байтному блоку Стрибог.
   * @param block Входной блок.
   */
  private STransform(block: Uint8Array): Uint8Array {
    return Uint8Array.from(block, (byte) => PI_TABLE[byte]);
  }

  /**
   * Перестановка P: result[i] = state[τ[i]]. Индекс 0 — младший байт.
   * @param state Входной блок.
   */
  private PTransform(state: Uint8Array): Uint8Array {
    return Uint8Array.from(STREEBOG_TAU_TABLE, (sourceIndex) => state[sourceIndex]);
  }

  /**
   * Линейное преобразование L. Блок разбит на восемь слов по 8 байт, индекс 0 слова — младший байт.
   * Массив битов строится как BitArray: младший бит первого байта получает индекс 0, затем биты разворачиваются,
   * чтобы индекс 0 совпал со строкой 0 матрицы A. Установленный бит складывает эту строку с суммой по модулю 2.
   * @param state 64-байтный блок.
   */
  private LTransform(state: Uint8Array): Uint8Array {
    const result = new Uint8Array(BLOCK_SIZE_BYTES);
    for (let wordIndex = 0; wordIndex < 8; wordIndex += 1) {
      const word = state.slice(wordIndex * 8, wordIndex * 8 + 8);
      const bits = toBitArray(word);
      bits.reverse();

      let value = 0n;
      for (let bitIndex = 0; bitIndex < 64; bitIndex += 1) {
        if (bits[bitIndex]) {
          value ^= STREEBOG_LINEAR_MATRIX_TABLE[bitIndex];
        }
      }

      result.set(toLittleEndianBytes(value), wordIndex * 8);
    }
    return result;
  }

  /**
   * Покомпонентное сложение двух блоков по модулю 2.
   * @param left Левый операнд.
   * @param right Правый операнд.
   */
  private XTransform(left: Uint8Array, right: Uint8Array): Uint8Array {
    return Uint8Array.from(left, (byte, index) => byte ^ right[index]);
  }

  /**
   * Читает блок как целое: индекс 0 — младший байт.
   * @param bytes 64 байта в нумерации ГОСТ.
   */
  private bytesToInteger(bytes: Uint8Array): bigint {
    return bytes.reduce((value, byte, index) => value | (BigInt(byte) << BigInt(index * 8)), 0n);
  }

  /**
   * Складывает 512-битный вектор с целым по модулю 2⁵¹².
   * @param left 64-байтный вектор, индекс 0 — младший байт.
   * @param right Слагаемое.
   */
  private addInteger(left: Uint8Array, right: bigint): Uint8Array {
    const modulus = 1n << 512n;
    const sum = (this.bytesToInteger(left) + (right % modulus)) % modulus;
    return Uint8Array.from({ length: BLOCK_SIZE_BYTES }, (_, index) => Number((sum >> BigInt(index * 8)) & 0xffn));
  }
}

/**
 * Кладёт байты сообщения в блок ГОСТ: последний байт сообщения — младший (индекс 0).
 * @param messageBytes Хвост сообщения, первый байт — старший.
 */
function toGostBlock(messageBytes: Uint8Array): Uint8Array {
  const block = new Uint8Array(BLOCK_SIZE_BYTES);
  block.set(new Uint8Array(messageBytes).reverse());
  return block;
}

/**
 * Разворачивает 64-байтный блок: младший байт меняется местами со старшим.
 * @param block Блок из 64 байт.
 */
function reverseBlock(block: Uint8Array): Uint8Array {
  return new Uint8Array(block).reverse();
}

/**
 * Массив битов в порядке BitArray: младший бит первого байта — индекс 0.
 * @param bytes Байты слова.
 */
function toBitArray(bytes: Uint8Array): boolean[] {
  const bits: boolean[] = [];
  for (const byte of bytes) {
    for (let bitIndex = 0; bitIndex < 8; bitIndex += 1) {
      bits.push(((byte >> bitIndex) & 1) === 1);
    }
  }
  return bits;
}

/**
 * Восемь младших байт целого. Индекс 0 — младший байт, как у BitConverter.GetBytes.
 * @param value 64-битное значение.
 */
function toLittleEndianBytes(value: bigint): Uint8Array {
  return Uint8Array.from({ length: 8 }, (_, byteIndex) => Number((value >> BigInt(byteIndex * 8)) & 0xffn));
}
