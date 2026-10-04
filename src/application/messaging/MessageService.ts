import type { IMessageEncryptionStrategy } from "@/application/messaging/IMessageEncryptionStrategy";
import type { IEncryptionMethodRepository } from "@/domain/access/IEncryptionMethodRepository";
import type { EncryptionMethod } from "@/domain/cryptography/EncryptionMethod";
import { ENCRYPTION_METHOD_LABELS } from "@/domain/cryptography/EncryptionMethod";
import { bitLengthOf } from "@/domain/cryptography/primes/BigIntegerArithmetic";
import { Streebog512Hasher } from "@/domain/cryptography/gost/Streebog512Hasher";
import { toHexString } from "@/domain/cryptography/HexEncoding";
import type { RsaStreebogDigitalSignature } from "@/domain/cryptography/rsa/RsaStreebogDigitalSignature";
import type { ISystemRsaKeyStore } from "@/domain/cryptography/rsa/ISystemRsaKeyStore";
import type { UserAccount } from "@/domain/identity/UserAccount";
import { UserRole } from "@/domain/identity/UserRole";
import type { EncryptedMessageRecord } from "@/domain/messaging/EncryptedMessageRecord";
import type { IEncryptedMessageRepository } from "@/domain/messaging/IEncryptedMessageRepository";
import { rsaKeyMaterialModulusBitLength, type EncryptionKeyMaterial } from "@/domain/messaging/EncryptionKeyMaterial";
import { fail, ok, type Result } from "@/domain/Result";
import { SignedPdfDocumentFactory } from "@/infrastructure/pdf/SignedPdfDocumentFactory";

/**
 * Шифрование, расшифрование, журнал сообщений и выгрузка подписанного PDF.
 */
export class MessageService {
  public constructor(
    private readonly encryptedMessageRepository: IEncryptedMessageRepository,
    private readonly encryptionMethodRepository: IEncryptionMethodRepository,
    private readonly encryptionStrategies: Record<EncryptionMethod, IMessageEncryptionStrategy>,
    private readonly systemRsaKeyStore: ISystemRsaKeyStore,
    private readonly digitalSignature: RsaStreebogDigitalSignature,
    private readonly pdfDocumentFactory: SignedPdfDocumentFactory,
  ) {}

  /**
   * Шифрует текст выбранным методом и сохраняет запись.
   * @param userId Автор.
   * @param plaintext Открытый текст.
   * @param method Метод шифрования.
   */
  public async encryptMessage(
    userId: string,
    plaintext: string,
    method: EncryptionMethod,
  ): Promise<Result<EncryptedMessageRecord>> {
    if (plaintext.trim().length === 0) {
      return fail("Сообщение не должно быть пустым.");
    }
    if (!(await this.encryptionMethodRepository.isEnabled(method))) {
      return fail("Этот метод шифрования отключён администратором.");
    }

    const strategy = this.strategyFor(method);
    if (strategy.isError) {
      return strategy;
    }

    const encrypted = await strategy.resultDto.encrypt(new TextEncoder().encode(plaintext));
    if (encrypted.isError) {
      return encrypted;
    }

    return ok(
      await this.encryptedMessageRepository.insert(
        userId,
        method,
        plaintext,
        encrypted.resultDto.ciphertextHex,
        encrypted.resultDto.keyMaterial,
      ),
    );
  }

  /**
   * Расшифровывает сообщение, если оно доступно пользователю.
   * @param actor Текущий пользователь.
   * @param messageId Идентификатор сообщения.
   */
  public async decryptMessage(
    actor: UserAccount,
    messageId: string,
  ): Promise<Result<{ plaintext: string; method: EncryptedMessageRecord["method"] }>> {
    const message = await this.requireReadableMessage(actor, messageId);
    if (message.isError) {
      return message;
    }

    const strategy = this.strategyFor(message.resultDto.method);
    if (strategy.isError) {
      return strategy;
    }

    const keyMaterial = message.resultDto.keyMaterial;
    if (!keyMaterial) {
      return fail("Ключ этого сообщения не сохранён.");
    }

    const plaintextBytes = await strategy.resultDto.decrypt(message.resultDto.ciphertextHex, keyMaterial);
    if (plaintextBytes.isError) {
      return plaintextBytes;
    }

    return ok({
      method: message.resultDto.method,
      plaintext: new TextDecoder().decode(plaintextBytes.resultDto),
    });
  }

  /**
   * Возвращает сообщения пользователя или все сообщения для администратора.
   * @param actor Текущий пользователь.
   */
  public async getEncryptedMessages(actor: UserAccount): Promise<EncryptedMessageRecord[]> {
    return actor.role === UserRole.ADMIN
      ? await this.encryptedMessageRepository.listAll()
      : await this.encryptedMessageRepository.listByUser(actor.id);
  }

  /**
   * Формирует PDF с открытым текстом, шифртекстом, ключами и подписью Стрибог-512 + RSA.
   * @param actor Текущий пользователь.
   * @param messageId Идентификатор сообщения.
   */
  public async exportMessageAsSignedPdf(
    actor: UserAccount,
    messageId: string,
  ): Promise<Result<{ fileName: string; pdfBytes: Uint8Array }>> {
    const message = await this.requireReadableMessage(actor, messageId);
    if (message.isError) {
      return message;
    }

    const keyMaterial = message.resultDto.keyMaterial;
    if (!keyMaterial) {
      return fail("Ключ этого сообщения не сохранён.");
    }

    const keyPair = await this.systemRsaKeyStore.tryGetKeyPair();
    if (!keyPair) {
      return fail("Подпись PDF невозможна: ключи RSA ещё не готовы.");
    }

    const hasher = new Streebog512Hasher();
    const payloadForSignature = new TextEncoder().encode(
      `${message.resultDto.id}|${message.resultDto.userLogin}|${message.resultDto.method}|${message.resultDto.plaintext}|${message.resultDto.ciphertextHex}|${message.resultDto.createdAt.toISOString()}`,
    );
    const contentHashHex = hasher.hashToHex(payloadForSignature);
    const signatureBytes = this.digitalSignature.sign(payloadForSignature, keyPair.privateKey);
    const signatureValid = this.digitalSignature.verify(payloadForSignature, signatureBytes, keyPair.publicKey);

    const pdfBytes = await this.pdfDocumentFactory.create({
      messageId: message.resultDto.id,
      userLogin: message.resultDto.userLogin,
      methodLabel: ENCRYPTION_METHOD_LABELS[message.resultDto.method],
      createdAtIso: message.resultDto.createdAt.toISOString(),
      plaintext: message.resultDto.plaintext,
      ciphertextHex: message.resultDto.ciphertextHex,
      keyDump: keyDumpLines(keyMaterial),
      streebog512Hex: contentHashHex,
      signatureHex: toHexString(signatureBytes),
      rsaModulusBitLength: bitLengthOf(keyPair.publicKey.modulus),
      signatureValid,
    });

    return ok({
      fileName: `message-${message.resultDto.id}.pdf`,
      pdfBytes,
    });
  }

  /**
   * Возвращает стратегию шифрования для метода.
   * @param method Метод шифрования.
   */
  private strategyFor(method: EncryptionMethod): Result<IMessageEncryptionStrategy> {
    const strategy = this.encryptionStrategies[method];
    if (!strategy) {
      return fail("Неизвестный метод шифрования.");
    }
    return ok(strategy);
  }

  /**
   * Загружает сообщение, если оно существует и доступно пользователю.
   * @param actor Текущий пользователь.
   * @param messageId Идентификатор сообщения.
   */
  private async requireReadableMessage(actor: UserAccount, messageId: string): Promise<Result<EncryptedMessageRecord>> {
    const message = await this.encryptedMessageRepository.findById(messageId);
    if (!message) {
      return fail("Сообщение не найдено.");
    }
    if (actor.role !== UserRole.ADMIN && message.userId !== actor.id) {
      return fail("Нельзя получить чужое сообщение.");
    }
    return ok(message);
  }
}

function keyDumpLines(keyMaterial: EncryptionKeyMaterial): Array<{ label: string; value: string }> {
  if (keyMaterial.method === "RSA") {
    return [
      { label: `RSA public key PEM (${rsaKeyMaterialModulusBitLength(keyMaterial)} bit)`, value: keyMaterial.publicKeyPem },
      { label: "RSA private key PEM (PKCS#1)", value: keyMaterial.privateKeyPem },
    ];
  }
  return [
    { label: "Kuznyechik key (hex)", value: keyMaterial.keyHex },
    { label: "Kuznyechik CBC IV (hex)", value: keyMaterial.ivHex },
  ];
}
