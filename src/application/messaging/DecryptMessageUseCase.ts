import { EncryptionMethod as EncryptionMethodValue } from "@/domain/cryptography/EncryptionMethod";
import { KuznyechikCipher } from "@/domain/cryptography/gost/KuznyechikCipher";
import { parseHexString } from "@/domain/cryptography/HexEncoding";
import { CryptographicRandomIntegerSource } from "@/domain/cryptography/primes/CryptographicRandomIntegerSource";
import { RsaCipher } from "@/domain/cryptography/rsa/RsaCipher";
import type { SystemRsaKeyStore } from "@/domain/cryptography/rsa/SystemRsaKeyStore";
import type { UserAccount } from "@/domain/identity/UserAccount";
import { UserRole } from "@/domain/identity/UserRole";
import type { EncryptedMessageRecord } from "@/domain/messaging/EncryptedMessageRecord";
import type { EncryptedMessageRepository } from "@/domain/messaging/EncryptedMessageRepository";

export class DecryptMessageUseCase {
  public constructor(
    private readonly encryptedMessageRepository: EncryptedMessageRepository,
    private readonly systemRsaKeyStore: SystemRsaKeyStore,
    private readonly kuznyechikMasterKey: Uint8Array,
    private readonly randomIntegerSource: CryptographicRandomIntegerSource,
  ) {}

  public async execute(actor: UserAccount, messageId: string): Promise<{ plaintext: string; method: EncryptedMessageRecord["method"] }> {
    const message = await this.encryptedMessageRepository.findById(messageId);
    if (!message) {
      throw new Error("Сообщение не найдено.");
    }
    if (actor.role !== UserRole.ADMIN && message.userId !== actor.id) {
      throw new Error("Нельзя расшифровать чужое сообщение.");
    }

    const ciphertext = parseHexString(message.ciphertextHex);
    let plaintextBytes: Uint8Array;

    if (message.method === EncryptionMethodValue.RSA) {
      const keyPair = await this.systemRsaKeyStore.tryGetKeyPair();
      if (!keyPair) {
        throw new Error("Ключи RSA ещё не готовы.");
      }
      plaintextBytes = new RsaCipher(this.randomIntegerSource).decrypt(ciphertext, keyPair.privateKey);
    } else {
      if (ciphertext.length < 32) {
        throw new Error("Шифртекст «Кузнечика» слишком короткий: нет IV.");
      }
      const initializationVector = ciphertext.subarray(0, 16);
      const body = ciphertext.subarray(16);
      plaintextBytes = new KuznyechikCipher(this.kuznyechikMasterKey).decryptCbc(body, initializationVector);
    }

    return {
      method: message.method,
      plaintext: new TextDecoder().decode(plaintextBytes),
    };
  }
}
