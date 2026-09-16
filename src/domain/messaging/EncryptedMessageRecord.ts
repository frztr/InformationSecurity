import type { EncryptionMethod } from "@/domain/cryptography/EncryptionMethod";
import type { EncryptionKeyMaterial } from "@/domain/messaging/EncryptionKeyMaterial";

export type EncryptedMessageRecord = {
  id: string;
  userId: string;
  userLogin: string;
  method: EncryptionMethod;
  plaintext: string;
  ciphertextHex: string;
  keyMaterial: EncryptionKeyMaterial | null;
  createdAt: Date;
};
