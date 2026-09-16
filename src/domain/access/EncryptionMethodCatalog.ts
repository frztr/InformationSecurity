import type { EncryptionMethod } from "@/domain/cryptography/EncryptionMethod";

export interface EncryptionMethodCatalog {
  isEnabled(method: EncryptionMethod): Promise<boolean>;
  list(): Promise<Array<{ method: EncryptionMethod; enabled: boolean }>>;
  setEnabled(method: EncryptionMethod, enabled: boolean): Promise<void>;
}
