import { EncryptionMethod as EncryptionMethodValue } from "@/domain/cryptography/EncryptionMethod";
import type { EncryptedMessageRecord } from "@/domain/messaging/EncryptedMessageRecord";
import type { EncryptedMessageRepository } from "@/domain/messaging/EncryptedMessageRepository";
import { fallbackKeyMaterialForMessage } from "@/domain/messaging/EncryptionKeyMaterial";
import type { SystemRsaKeyStore } from "@/domain/cryptography/rsa/SystemRsaKeyStore";
import { UserRole } from "@/domain/identity/UserRole";
import type { UserAccount } from "@/domain/identity/UserAccount";

export class ListMessagesUseCase {
  public constructor(
    private readonly encryptedMessageRepository: EncryptedMessageRepository,
    private readonly systemRsaKeyStore: SystemRsaKeyStore,
    private readonly kuznyechikMasterKey: Uint8Array,
  ) {}

  public async execute(actor: UserAccount): Promise<EncryptedMessageRecord[]> {
    const messages =
      actor.role === UserRole.ADMIN
        ? await this.encryptedMessageRepository.listAll()
        : await this.encryptedMessageRepository.listByUser(actor.id);

    const needsRsaFallback = messages.some((message) => message.method === EncryptionMethodValue.RSA && !message.keyMaterial);
    const rsaKeyPair = needsRsaFallback ? await this.systemRsaKeyStore.tryGetKeyPair() : null;

    return messages.map((message) => ({
      ...message,
      keyMaterial:
        message.keyMaterial ??
        fallbackKeyMaterialForMessage(message.method, message.ciphertextHex, rsaKeyPair, this.kuznyechikMasterKey),
    }));
  }
}
