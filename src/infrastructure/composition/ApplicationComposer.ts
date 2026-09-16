import "server-only";

import { CreateUserByAdminUseCase } from "@/application/administration/CreateUserByAdminUseCase";
import {
  PublishDefaultAdminEnrollmentUseCase,
  sendAdminEnrollmentMail,
} from "@/application/administration/PublishDefaultAdminEnrollmentUseCase";
import { ToggleEncryptionMethodUseCase } from "@/application/administration/ToggleEncryptionMethodUseCase";
import { ConfirmPasswordResetUseCase } from "@/application/identity/ConfirmPasswordResetUseCase";
import { LoginPasswordUseCase } from "@/application/identity/LoginPasswordUseCase";
import { RegisterUserUseCase } from "@/application/identity/RegisterUserUseCase";
import { RequestPasswordResetUseCase } from "@/application/identity/RequestPasswordResetUseCase";
import { VerifyEmailOtpUseCase } from "@/application/identity/VerifyEmailOtpUseCase";
import { VerifyThirdFactorUseCase } from "@/application/identity/VerifyThirdFactorUseCase";
import { DecryptMessageUseCase } from "@/application/messaging/DecryptMessageUseCase";
import { EncryptMessageUseCase } from "@/application/messaging/EncryptMessageUseCase";
import { ExportSignedPdfUseCase } from "@/application/messaging/ExportSignedPdfUseCase";
import { ListMessagesUseCase } from "@/application/messaging/ListMessagesUseCase";
import { EncryptionMethod } from "@/domain/cryptography/EncryptionMethod";
import { parseHexString } from "@/domain/cryptography/HexEncoding";
import { CryptographicRandomIntegerSource } from "@/domain/cryptography/primes/CryptographicRandomIntegerSource";
import { RsaKeyPairAssembler } from "@/domain/cryptography/rsa/RsaKeyPairAssembler";
import { RsaStreebogDigitalSignature } from "@/domain/cryptography/rsa/RsaStreebogDigitalSignature";
import { TotpOneTimePasswordService } from "@/domain/identity/TotpOneTimePasswordService";
import type { MailGateway } from "@/domain/identity/MailGateway";
import type { UserAccount } from "@/domain/identity/UserAccount";
import {
  buildDatabaseUrl,
  loadApplicationSecrets,
  loadApplicationSettings,
  type ApplicationSecrets,
  type ApplicationSettings,
} from "@/infrastructure/config/loadApplicationConfiguration";
import { StreebogPasswordHasher } from "@/infrastructure/identity/StreebogPasswordHasher";
import { hashOpaqueSecret } from "@/infrastructure/identity/SecretDigest";
import {
  isAdminEnrollmentMailSent,
  markAdminEnrollmentMailSent,
  readOrCreateAdminEnrollment,
} from "@/infrastructure/identity/AdminEnrollmentPublicationStore";
import { KafkaRsaKeyAssembler } from "@/infrastructure/kafka/KafkaRsaKeyAssembler";
import { SmtpMailGateway } from "@/infrastructure/mail/SmtpMailGateway";
import { SignedPdfDocumentFactory } from "@/infrastructure/pdf/SignedPdfDocumentFactory";
import { PrismaCollectedPrimeNumberRepository } from "@/infrastructure/persistence/prisma/PrismaCollectedPrimeNumberRepository";
import { PrismaEmailOtpRepository } from "@/infrastructure/persistence/prisma/PrismaEmailOtpRepository";
import { PrismaEncryptedMessageRepository } from "@/infrastructure/persistence/prisma/PrismaEncryptedMessageRepository";
import { PrismaEncryptionMethodCatalog } from "@/infrastructure/persistence/prisma/PrismaEncryptionMethodCatalog";
import { PrismaPasswordResetTokenRepository } from "@/infrastructure/persistence/prisma/PrismaPasswordResetTokenRepository";
import { PrismaPendingLoginRepository } from "@/infrastructure/persistence/prisma/PrismaPendingLoginRepository";
import { getPrismaClient } from "@/infrastructure/persistence/prisma/PrismaClientSingleton";
import { PrismaRecoveryCodeRepository } from "@/infrastructure/persistence/prisma/PrismaRecoveryCodeRepository";
import { PrismaSessionRepository } from "@/infrastructure/persistence/prisma/PrismaSessionRepository";
import { PrismaSystemRsaKeyStore } from "@/infrastructure/persistence/prisma/PrismaSystemRsaKeyStore";
import { PrismaUserAccountRepository } from "@/infrastructure/persistence/prisma/PrismaUserAccountRepository";

export type ApplicationComposer = {
  settings: ApplicationSettings;
  secrets: ApplicationSecrets;
  registerUserUseCase: RegisterUserUseCase;
  loginPasswordUseCase: LoginPasswordUseCase;
  verifyEmailOtpUseCase: VerifyEmailOtpUseCase;
  verifyThirdFactorUseCase: VerifyThirdFactorUseCase;
  requestPasswordResetUseCase: RequestPasswordResetUseCase;
  confirmPasswordResetUseCase: ConfirmPasswordResetUseCase;
  encryptMessageUseCase: EncryptMessageUseCase;
  decryptMessageUseCase: DecryptMessageUseCase;
  listMessagesUseCase: ListMessagesUseCase;
  exportSignedPdfUseCase: ExportSignedPdfUseCase;
  toggleEncryptionMethodUseCase: ToggleEncryptionMethodUseCase;
  createUserByAdminUseCase: CreateUserByAdminUseCase;
  publishDefaultAdminEnrollmentUseCase: PublishDefaultAdminEnrollmentUseCase;
  mailGateway: MailGateway;
  passwordHasher: StreebogPasswordHasher;
  encryptionMethodCatalog: PrismaEncryptionMethodCatalog;
  userAccountRepository: PrismaUserAccountRepository;
  sessionRepository: PrismaSessionRepository;
  systemRsaKeyStore: PrismaSystemRsaKeyStore;
  collectedPrimeNumberRepository: PrismaCollectedPrimeNumberRepository;
};

let composerInstance: ApplicationComposer | null = null;
let kafkaRsaAssemblerStarted = false;

export function getApplicationComposer(): ApplicationComposer {
  if (composerInstance) {
    return composerInstance;
  }

  const settings = loadApplicationSettings();
  const secrets = loadApplicationSecrets();
  process.env.DATABASE_URL = buildDatabaseUrl(settings, secrets);

  const randomIntegerSource = new CryptographicRandomIntegerSource();
  const userAccountRepository = new PrismaUserAccountRepository();
  const recoveryCodeRepository = new PrismaRecoveryCodeRepository();
  const emailOtpRepository = new PrismaEmailOtpRepository();
  const passwordResetTokenRepository = new PrismaPasswordResetTokenRepository();
  const pendingLoginRepository = new PrismaPendingLoginRepository();
  const sessionRepository = new PrismaSessionRepository();
  const encryptedMessageRepository = new PrismaEncryptedMessageRepository();
  const encryptionMethodCatalog = new PrismaEncryptionMethodCatalog();
  const systemRsaKeyStore = new PrismaSystemRsaKeyStore();
  const collectedPrimeNumberRepository = new PrismaCollectedPrimeNumberRepository();
  const passwordHasher = new StreebogPasswordHasher();
  const mailGateway = new SmtpMailGateway({
    host: settings.smtp.host,
    port: settings.smtp.port,
    from: settings.smtp.from,
  });

  const registerUserUseCase = new RegisterUserUseCase(
    userAccountRepository,
    recoveryCodeRepository,
    passwordHasher,
    mailGateway,
    settings.mail.domain,
    settings.auth.totpIssuer,
    settings.auth.recoveryCodeCount,
  );

  composerInstance = {
    settings,
    secrets,
    registerUserUseCase,
    loginPasswordUseCase: new LoginPasswordUseCase(
      userAccountRepository,
      passwordHasher,
      pendingLoginRepository,
      emailOtpRepository,
      mailGateway,
      settings.auth.emailOtpTtlSeconds,
      settings.auth.pendingLoginTtlMinutes,
    ),
    verifyEmailOtpUseCase: new VerifyEmailOtpUseCase(pendingLoginRepository, emailOtpRepository),
    verifyThirdFactorUseCase: new VerifyThirdFactorUseCase(
      pendingLoginRepository,
      userAccountRepository,
      recoveryCodeRepository,
      sessionRepository,
      new TotpOneTimePasswordService(),
      settings.auth.sessionTtlHours,
    ),
    requestPasswordResetUseCase: new RequestPasswordResetUseCase(
      userAccountRepository,
      emailOtpRepository,
      passwordResetTokenRepository,
      mailGateway,
      settings.auth.emailOtpTtlSeconds,
      settings.auth.passwordResetTtlMinutes,
    ),
    confirmPasswordResetUseCase: new ConfirmPasswordResetUseCase(
      userAccountRepository,
      emailOtpRepository,
      passwordResetTokenRepository,
      passwordHasher,
    ),
    encryptMessageUseCase: new EncryptMessageUseCase(
      encryptedMessageRepository,
      encryptionMethodCatalog,
      systemRsaKeyStore,
      parseHexString(secrets.kuznyechik.masterKeyHex),
      randomIntegerSource,
    ),
    decryptMessageUseCase: new DecryptMessageUseCase(
      encryptedMessageRepository,
      systemRsaKeyStore,
      parseHexString(secrets.kuznyechik.masterKeyHex),
      randomIntegerSource,
    ),
    listMessagesUseCase: new ListMessagesUseCase(
      encryptedMessageRepository,
      systemRsaKeyStore,
      parseHexString(secrets.kuznyechik.masterKeyHex),
    ),
    exportSignedPdfUseCase: new ExportSignedPdfUseCase(
      encryptedMessageRepository,
      systemRsaKeyStore,
      new RsaStreebogDigitalSignature(),
      new SignedPdfDocumentFactory(),
      parseHexString(secrets.kuznyechik.masterKeyHex),
    ),
    toggleEncryptionMethodUseCase: new ToggleEncryptionMethodUseCase(encryptionMethodCatalog),
    createUserByAdminUseCase: new CreateUserByAdminUseCase(registerUserUseCase),
    publishDefaultAdminEnrollmentUseCase: new PublishDefaultAdminEnrollmentUseCase(
      userAccountRepository,
      recoveryCodeRepository,
      registerUserUseCase,
      settings.auth.totpIssuer,
      settings.auth.recoveryCodeCount,
    ),
    mailGateway,
    passwordHasher,
    encryptionMethodCatalog,
    userAccountRepository,
    sessionRepository,
    systemRsaKeyStore,
    collectedPrimeNumberRepository,
  };

  return composerInstance;
}

async function publishDefaultAdminEnrollment(composer: ApplicationComposer): Promise<void> {
  const { enrollment, createdNow } = await readOrCreateAdminEnrollment(() =>
    composer.publishDefaultAdminEnrollmentUseCase.execute(composer.secrets.admin),
  );
  if (createdNow) {
    if (enrollment.created) {
      console.info("Создан администратор по умолчанию.");
    }
    console.info(`TOTP secret: ${enrollment.totpSecretBase32}`);
    console.info(`OTPAuth: ${enrollment.otpAuthUrl}`);
    console.info(`Коды восстановления: ${enrollment.recoveryCodes.join(", ")}`);
  }

  if (isAdminEnrollmentMailSent()) {
    return;
  }

  try {
    await sendAdminEnrollmentMail(composer.mailGateway, enrollment, composer.settings.mail.webmailUrl);
    markAdminEnrollmentMailSent();
    console.info(`TOTP и коды восстановления отправлены на ${enrollment.email}`);
  } catch (error) {
    console.warn("Не удалось отправить TOTP администратора на почту, повторю при следующем запросе:", error);
  }
}

async function rehashDefaultAdminPasswordIfNeeded(composer: ApplicationComposer): Promise<void> {
  const admin = await composer.userAccountRepository.findByLogin(composer.secrets.admin.login);
  if (!admin) {
    return;
  }
  const storedHash = await composer.userAccountRepository.getPasswordHash(admin.id);
  const passwordMatches = await composer.passwordHasher.verify(composer.secrets.admin.password, storedHash);
  if (passwordMatches) {
    return;
  }
  await composer.userAccountRepository.updatePassword(
    admin.id,
    await composer.passwordHasher.hash(composer.secrets.admin.password),
  );
  console.info("Пароль администратора перехеширован Стрибог-512.");
}

export async function initializeApplication(): Promise<void> {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return;
  }

  const composer = getApplicationComposer();
  await getPrismaClient().$connect();

  const existingMethods = await composer.encryptionMethodCatalog.list();
  if (existingMethods.length === 0) {
    await composer.encryptionMethodCatalog.setEnabled(EncryptionMethod.RSA, true);
    await composer.encryptionMethodCatalog.setEnabled(EncryptionMethod.KUZNYECHIK, true);
  }

  await publishDefaultAdminEnrollment(composer);
  await rehashDefaultAdminPasswordIfNeeded(composer);

  const keyPair = await composer.systemRsaKeyStore.tryGetKeyPair();
  const modulusBitLength = Number(process.env.RSA_MODULUS_BIT_LENGTH ?? composer.settings.rsa.modulusBitLength);
  const keyMatchesConfiguredLength = keyPair?.publicKey.modulusBitLength === modulusBitLength;
  if (!keyMatchesConfiguredLength && !kafkaRsaAssemblerStarted) {
    kafkaRsaAssemblerStarted = true;
    const brokersFromEnvironment = process.env.KAFKA_BROKERS;
    const kafkaBrokers = brokersFromEnvironment
      ? brokersFromEnvironment.split(",").map((broker) => broker.trim())
      : composer.settings.kafka.brokers;
    const assembler = new KafkaRsaKeyAssembler(
      {
        brokers: kafkaBrokers,
        topic: process.env.KAFKA_TOPIC ?? composer.settings.kafka.topic,
        clientId: process.env.KAFKA_CLIENT_ID ?? composer.settings.kafka.clientId,
        groupId: process.env.KAFKA_GROUP_ID ?? composer.settings.kafka.groupId,
      },
      composer.collectedPrimeNumberRepository,
      composer.systemRsaKeyStore,
      new RsaKeyPairAssembler(),
      BigInt(composer.settings.rsa.publicExponent),
      modulusBitLength,
    );
    void assembler.start().catch((error: unknown) => {
      console.error("Не удалось запустить сборку RSA из Kafka:", error);
    });
  }
}

export async function resolveSessionUser(sessionToken: string | undefined): Promise<UserAccount | null> {
  if (!sessionToken) {
    return null;
  }
  const composer = getApplicationComposer();
  const session = await composer.sessionRepository.findByTokenHash(hashOpaqueSecret(sessionToken));
  if (!session) {
    return null;
  }
  return composer.userAccountRepository.findById(session.userId);
}
