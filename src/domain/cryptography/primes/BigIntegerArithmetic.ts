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
 * CRT-ускорение RSA(китайская теорема об остатках): c^d mod (p·q) через два возведения по модулям p и q.
 * @param message Основание c. Шифруемое сообщение.
 * @param d Показатель d. Секретная экспонента.
 * @param p Простой множитель модуля p.
 * @param q Простой множитель модуля q.
 * @returns c^d mod (p·q).
 */
export function rsaCrtModularPower(
  message: bigint,
  d: bigint,
  p: bigint,
  q: bigint,
): bigint {
  if (p === q || p <= 1n || q <= 1n) {
    throw new Error("Для CRT нужны два различных простых p и q.");
  }

  const dp = d % (p - 1n);
  const dq = d % (q - 1n);
  const a2 = modularPower(message % p, dp, p);
  const x1 = modularPower(message % q, dq, q);
  const x2 = (((a2 - x1) % p + p) * modularInverse(q, p)) % p;
  return x1 + x2 * q;
}
