export type CollectedPrimeNumber = {
  decimalValue: string;
  bitLength: number;
};

export interface CollectedPrimeNumberRepository {
  addIfAbsent(decimalValue: string, bitLength: number): Promise<void>;
  listByBitLength(bitLength: number): Promise<CollectedPrimeNumber[]>;
  countByBitLength(bitLength: number): Promise<number>;
}
