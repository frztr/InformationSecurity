export function bitLengthOf(value: bigint): number {
  if (value < 0n) {
    throw new Error("Длина в битах определена только для неотрицательных чисел.");
  }
  if (value === 0n) {
    return 0;
  }
  return value.toString(2).length;
}

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

export function modularInverse(value: bigint, modulus: bigint): bigint {
  let oldT = 0n;
  let currentT = 1n;
  let oldR = modulus;
  let currentR = ((value % modulus) + modulus) % modulus;

  while (currentR !== 0n) {
    const quotient = oldR / currentR;
    const nextT = oldT - quotient * currentT;
    const nextR = oldR - quotient * currentR;
    oldT = currentT;
    currentT = nextT;
    oldR = currentR;
    currentR = nextR;
  }

  if (oldR !== 1n) {
    throw new Error("Обратный элемент не существует: числа не взаимно просты.");
  }

  return ((oldT % modulus) + modulus) % modulus;
}

export function leastCommonMultiple(left: bigint, right: bigint): bigint {
  return (left / greatestCommonDivisor(left, right)) * right;
}

/**
 * CRT-ускорение RSA: c^d mod (p·q) через два возведения по модулям p и q.
 * Без этого расшифрование и ЭЦП на RSA-32768 в JS практически не завершаются.
 */
export function rsaCrtModularPower(
  ciphertext: bigint,
  privateExponent: bigint,
  primeP: bigint,
  primeQ: bigint,
): bigint {
  if (primeP === primeQ || primeP <= 1n || primeQ <= 1n) {
    throw new Error("Для CRT нужны два различных простых p и q.");
  }

  const dp = privateExponent % (primeP - 1n);
  const dq = privateExponent % (primeQ - 1n);
  const qInverseModP = modularInverse(primeQ, primeP);
  const messageModP = modularPower(ciphertext % primeP, dp, primeP);
  const messageModQ = modularPower(ciphertext % primeQ, dq, primeQ);
  const h = (qInverseModP * ((messageModP - messageModQ) % primeP + primeP)) % primeP;
  return messageModQ + h * primeQ;
}
