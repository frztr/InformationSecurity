import type { RsaKeyPair } from "@/domain/cryptography/rsa/RsaKeyPair";

export type RsaKeyStatus = "GENERATING" | "READY";

export interface SystemRsaKeyStore {
  getStatus(): Promise<{ status: RsaKeyStatus; modulusBitLength: number }>;
  tryGetKeyPair(): Promise<RsaKeyPair | null>;
  markGenerating(modulusBitLength: number): Promise<void>;
  saveKeyPair(keyPair: RsaKeyPair): Promise<void>;
}
