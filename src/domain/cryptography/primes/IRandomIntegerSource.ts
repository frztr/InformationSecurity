/**
 * Источник случайных байт и целых чисел на заданном отрезке.
 */
export interface IRandomIntegerSource {
  /**
   * Заполняет буфер случайными байтами.
   * @param buffer Целевой буфер.
   */
  fillBytes(buffer: Uint8Array): void;
  /**
   * Возвращает новый массив из заданного числа случайных байт.
   * @param byteCount Длина массива.
   * @returns Случайные байты.
   */
  nextBytes(byteCount: number): Uint8Array;
  /**
   * Равномерно выбирает целое на закрытом отрезке.
   * @param inclusiveMinimum Нижняя граница включительно.
   * @param inclusiveMaximum Верхняя граница включительно.
   * @returns Случайное целое из [inclusiveMinimum, inclusiveMaximum].
   */
  nextInclusive(inclusiveMinimum: bigint, inclusiveMaximum: bigint): bigint;
}
