/**
 * Сравнивает массивы байт за время, не зависящее от совпадения префикса.
 * @param left Первый массив.
 * @param right Второй массив.
 * @returns true, если массивы равны.
 */
export function constantTimeEquals(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) {
    return false;
  }
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}
