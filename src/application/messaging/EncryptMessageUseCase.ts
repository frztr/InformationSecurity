import type { EncryptionMethod } from "@/domain/cryptography/EncryptionMethod";
import { EncryptionMethod as EncryptionMethodValue } from "@/domain/cryptography/EncryptionMethod";
import type { EncryptionMethodCatalog } from "@/domain/access/EncryptionMethodCatalog";
import { KuznyechikCipher } from "@/domain/cryptography/gost/KuznyechikCipher";
import { toHexString } from "@/domain/cryptography/HexEncoding";
import { CryptographicRandomIntegerSource } from "@/domain/cryptography/primes/CryptographicRandomIntegerSource";
import { RsaCipher } from "@/domain/cryptography/rsa/RsaCipher";
import type { SystemRsaKeyStore } from "@/domain/cryptography/rsa/SystemRsaKeyStore";
import type { EncryptedMessageRecord } from "@/domain/messaging/EncryptedMessageRecord";
import type { EncryptedMessageRepository } from "@/domain/messaging/EncryptedMessageRepository";
import {
  kuznyechikEncryptionKeyMaterial,
  rsaEncryptionKeyMaterial,
} from "@/domain/messaging/EncryptionKeyMaterial";

export class EncryptMessageUseCase {
  public constructor(
    private readonly encryptedMessageRepository: EncryptedMessageRepository,
    private readonly encryptionMethodCatalog: EncryptionMethodCatalog,
    private readonly systemRsaKeyStore: SystemRsaKeyStore,
    private readonly kuznyechikMasterKey: Uint8Array,
    private readonly randomIntegerSource: CryptographicRandomIntegerSource,
  ) {}

  public async execute(userId: string, plaintext: string, method: EncryptionMethod): Promise<EncryptedMessageRecord> {
    if (plaintext.trim().length === 0) {
      throw new Error("Сообщение не должно быть пустым.");
    }

    const enabled = await this.encryptionMethodCatalog.isEnabled(method);
    if (!enabled) {
      throw new Error("Этот метод шифрования отключён администратором.");
    }

    const plaintextBytes = new TextEncoder().encode(plaintext);
    let ciphertextHex: string;

    if (method === EncryptionMethodValue.RSA) {
      const keyPair = await this.systemRsaKeyStore.tryGetKeyPair();
      if (!keyPair) {
        throw new Error("Ключи RSA ещё собираются из простых Kafka. Подождите или используйте «Кузнечик».");
      }
      const rsaCipher = new RsaCipher(this.randomIntegerSource);
      ciphertextHex = toHexString(rsaCipher.encrypt(plaintextBytes, keyPair.publicKey));
      return this.encryptedMessageRepository.insert(
        userId,
        method,
        plaintext,
        ciphertextHex,
        rsaEncryptionKeyMaterial(keyPair),
      );
    }

    const initializationVector = new Uint8Array(16);
    this.randomIntegerSource.fillBytes(initializationVector);
    const kuznyechik = new KuznyechikCipher(this.kuznyechikMasterKey);
    const ciphertext = kuznyechik.encryptCbc(plaintextBytes, initializationVector);
    ciphertextHex = `${toHexString(initializationVector)}${toHexString(ciphertext)}`;
    return this.encryptedMessageRepository.insert(
      userId,
      method,
      plaintext,
      ciphertextHex,
      kuznyechikEncryptionKeyMaterial(this.kuznyechikMasterKey, initializationVector),
    );
  }
}
