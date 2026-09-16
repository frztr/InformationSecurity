export interface RandomIntegerSource {
  fillBytes(buffer: Uint8Array): void;
  nextInclusive(inclusiveMinimum: bigint, inclusiveMaximum: bigint): bigint;
}
