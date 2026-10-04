/**
 * Возвращает битовую длину неотрицательного целого.
 * @param value Неотрицательное целое.
 * @returns Число бит; для нуля — 0.
 */
export function bitLengthOf(value: bigint): number {
  if (value < 0n) {
    throw new Error("Длина в битах определена только для неотрицательных чисел.");
  }
  if (value === 0n) {
    return 0;
  }
  return value.toString(2).length;
}

/**
 * Возводит основание в степень по модулю (двоичное возведение).
 * @param base Основание.
 * @param exponent Показатель.
 * @param modulus Положительный модуль.
 * @returns base^exponent mod modulus.
 */
export function modularPower(base: bigint, exponent: bigint, modulus: bigint): bigint {
  if (modulus <= 0n) {
    throw new Error("Модуль должен быть положительным.");
  }

  let result = 1n;
  let currentBase = ((base % modulus) + modulus) % modulus;
  let remainingExponent = exponent;

  while (remainingExponent > 0n) {
    if ((remainingExponent & 1n) === 1n) {
      result = (result * currentBase) % modulus;
    }
    currentBase = (currentBase * currentBase) % modulus;
    remainingExponent >>= 1n;
  }

  return result;
}

/**
 * Вычисляет наибольший общий делитель (алгоритм Евклида).
 * @param left Первое целое.
 * @param right Второе целое.
 * @returns НОД(|left|, |right|).
 */
export function greatestCommonDivisor(left: bigint, right: bigint): bigint {
  let first = left < 0n ? -left : left;
  let second = right < 0n ? -right : right;
  while (second !== 0n) {
    const remainder = first % second;
    first = second;
    second = remainder;
  }
  return first;
}

/**
 * Вычисляет обратный элемент по модулю (расширенный алгоритм Евклида).
 * @param value Число, взаимно простое с модулем.
 * @param modulus Модуль.
 * @returns value⁻¹ mod modulus.
 */
export function modularInverse(value: bigint, modulus: bigint): bigint {
  let prevPrevXn = 0n;
  let prevXn = 1n;
  let prevPrevYn = modulus;
  let prevYn = ((value % modulus) + modulus) % modulus;

  while (prevYn !== 0n) {
    const prevQ = prevPrevYn / prevYn;
    const xN = prevPrevXn - prevQ * prevXn;
    const yN = prevPrevYn - prevQ * prevYn;
    prevPrevXn = prevXn;
    prevXn = xN;
    prevPrevYn = prevYn;
    prevYn = yN;
  }

  if (prevPrevYn !== 1n) {
    throw new Error("Обратный элемент не существует: числа не взаимно просты.");
  }

  return ((prevPrevXn % modulus) + modulus) % modulus;
}

/**
 * Вычисляет наименьшее общее кратное.
 * @param left Первое целое.
 * @param right Второе целое.
 * @returns НОК(left, right).
 */
export function leastCommonMultiple(left: bigint, right: bigint): bigint {
  return (left / greatestCommonDivisor(left, right)) * right;
}

/**
 * CRT-ускорение RSA: c^d mod (p·q) через dp, dq, qInv из закрытого ключа.
 * @param message Основание c.
 * @param primeP Простое p.
 * @param primeQ Простое q.
 * @param dp d mod (p − 1).
 * @param dq d mod (q − 1).
 * @param qInv q⁻¹ mod p.
 * @returns c^d mod (p·q).
 */
export function rsaCrtModularPower(
  message: bigint,
  primeP: bigint,
  primeQ: bigint,
  dp: bigint,
  dq: bigint,
  qInv: bigint,
): bigint {
  if (primeP === primeQ || primeP <= 1n || primeQ <= 1n) {
    throw new Error("Для CRT нужны два различных простых p и q.");
  }

  const residueModP = modularPower(message % primeP, dp, primeP);
  const residueModQ = modularPower(message % primeQ, dq, primeQ);
  const h = (((residueModP - residueModQ) % primeP + primeP) * qInv) % primeP;
  return residueModQ + h * primeQ;
}

/**
 * Читает байты как целое. Первый байт — старший.
 * @param bytes Исходные байты.
 */
export function bytesToBigEndianInteger(bytes: Uint8Array): bigint {
  let value = 0n;
  for (const byte of bytes) {
    value = (value << 8n) | BigInt(byte);
  }
  return value;
}

/**
 * Записывает целое в буфер фиксированной длины. Первый байт — старший, недостающие старшие байты — нули.
 * @param value Неотрицательное целое.
 * @param byteLength Длина буфера в байтах.
 */
export function bigEndianIntegerToBytes(value: bigint, byteLength: number): Uint8Array {
  if (bitLengthOf(value) > byteLength * 8) {
    throw new Error("Целое число не помещается в запрошенную длину блока RSA.");
  }
  const bytes = new Uint8Array(byteLength);
  let remaining = value;
  for (let index = byteLength - 1; index >= 0; index -= 1) {
    bytes[index] = Number(remaining & 0xffn);
    remaining >>= 8n;
  }
  return bytes;
}
