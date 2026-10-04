/**
 * Собранное простое число в десятичной записи.
 */
export type CollectedPrimeNumber = {
  /** Десятичная запись числа. */
  decimalValue: string;
  /** Длина числа в битах. */
  bitLength: number;
};

/**
 * Хранилище собранных простых чисел, сгруппированных по битовой длине.
 */
export interface ICollectedPrimeNumberRepository {
  /**
   * Добавляет число, если такой записи ещё нет.
   * @param decimalValue Десятичная запись.
   * @param bitLength Длина в битах.
   */
  addIfAbsent(decimalValue: string, bitLength: number): Promise<void>;
  /**
   * Возвращает все сохранённые числа заданной битовой длины.
   * @param bitLength Запрошенная длина в битах.
   * @returns Список записей.
   */
  listByBitLength(bitLength: number): Promise<CollectedPrimeNumber[]>;
  /**
   * Возвращает число сохранённых записей заданной битовой длины.
   * @param bitLength Запрошенная длина в битах.
   * @returns Количество записей.
   */
  countByBitLength(bitLength: number): Promise<number>;
  /**
   * Удаляет простые с указанными десятичными записями.
   * @param decimalValues Десятичные записи.
   * @returns Сколько записей удалено.
   */
  deleteByDecimalValues(decimalValues: readonly string[]): Promise<number>;
}
