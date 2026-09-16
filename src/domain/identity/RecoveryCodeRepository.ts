export interface RecoveryCodeRepository {
  replaceAll(userId: string, codeHashes: string[]): Promise<void>;
  consumeUnused(userId: string, codeHash: string): Promise<boolean>;
}
