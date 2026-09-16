import { ENCRYPTION_METHOD_LABELS } from "@/domain/cryptography/EncryptionMethod";
import { Streebog512Hasher } from "@/domain/cryptography/gost/Streebog512Hasher";
import { toHexString } from "@/domain/cryptography/HexEncoding";
import type { RsaStreebogDigitalSignature } from "@/domain/cryptography/rsa/RsaStreebogDigitalSignature";
import type { SystemRsaKeyStore } from "@/domain/cryptography/rsa/SystemRsaKeyStore";
import type { UserAccount } from "@/domain/identity/UserAccount";
import { UserRole } from "@/domain/identity/UserRole";
import type { EncryptedMessageRepository } from "@/domain/messaging/EncryptedMessageRepository";
import { fallbackKeyMaterialForMessage, type EncryptionKeyMaterial } from "@/domain/messaging/EncryptionKeyMaterial";
import { SignedPdfDocumentFactory } from "@/infrastructure/pdf/SignedPdfDocumentFactory";

export class ExportSignedPdfUseCase {
  public constructor(
    private readonly encryptedMessageRepository: EncryptedMessageRepository,
    private readonly systemRsaKeyStore: SystemRsaKeyStore,
    private readonly digitalSignature: RsaStreebogDigitalSignature,
    private readonly pdfDocumentFactory: SignedPdfDocumentFactory,
    private readonly kuznyechikMasterKey: Uint8Array,
  ) {}

  public async execute(actor: UserAccount, messageId: string): Promise<{ fileName: string; pdfBytes: Uint8Array }> {
    const message = await this.encryptedMessageRepository.findById(messageId);
    if (!message) {
      throw new Error("Сообщение не найдено.");
    }
    if (actor.role !== UserRole.ADMIN && message.userId !== actor.id) {
      throw new Error("Нельзя скачать чужое сообщение.");
    }

    const keyPair = await this.systemRsaKeyStore.tryGetKeyPair();
    if (!keyPair) {
      throw new Error("Подпись PDF невозможна: ключи RSA ещё не готовы.");
    }

    const hasher = new Streebog512Hasher();
    const payloadForSignature = new TextEncoder().encode(
      `${message.id}|${message.userLogin}|${message.method}|${message.plaintext}|${message.ciphertextHex}|${message.createdAt.toISOString()}`,
    );
    const contentHashHex = hasher.hashToHex(payloadForSignature);
    const signatureBytes = this.digitalSignature.sign(payloadForSignature, keyPair.privateKey);
    const signatureValid = this.digitalSignature.verify(payloadForSignature, signatureBytes, keyPair.publicKey);
    const keyMaterial =
      message.keyMaterial ??
      fallbackKeyMaterialForMessage(message.method, message.ciphertextHex, keyPair, this.kuznyechikMasterKey);

    const pdfBytes = await this.pdfDocumentFactory.create({
      messageId: message.id,
      userLogin: message.userLogin,
      methodLabel: ENCRYPTION_METHOD_LABELS[message.method],
      createdAtIso: message.createdAt.toISOString(),
      plaintext: message.plaintext,
      ciphertextHex: message.ciphertextHex,
      keyDump: keyDumpLines(keyMaterial),
      streebog512Hex: contentHashHex,
      signatureHex: toHexString(signatureBytes),
      rsaModulusBitLength: keyPair.publicKey.modulusBitLength,
      signatureValid,
    });

    return {
      fileName: `message-${message.id}.pdf`,
      pdfBytes,
    };
  }
}

function keyDumpLines(keyMaterial: EncryptionKeyMaterial | null): Array<{ label: string; value: string }> {
  if (!keyMaterial) {
    return [{ label: "keys", value: "unavailable" }];
  }
  if (keyMaterial.method === "RSA") {
    return [
      { label: `RSA public key PEM (${keyMaterial.modulusBitLength} bit)`, value: keyMaterial.publicKeyPem },
      { label: "RSA private key PEM (PKCS#1)", value: keyMaterial.privateKeyPem },
    ];
  }
  return [
    { label: "Kuznyechik key (hex)", value: keyMaterial.keyHex },
    { label: "Kuznyechik CBC IV (hex)", value: keyMaterial.ivHex },
  ];
}
