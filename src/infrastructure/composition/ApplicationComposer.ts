import "server-only";

import { AdministrationService, sendAdminEnrollmentMail } from "@/application/administration/AdministrationService";
import { AuthenticationService } from "@/application/identity/AuthenticationService";
import { PasswordResetService } from "@/application/identity/PasswordResetService";
import { RegistrationService } from "@/application/identity/RegistrationService";
import { MessageService } from "@/application/messaging/MessageService";
import { RsaMessageEncryptionStrategy } from "@/application/messaging/RsaMessageEncryptionStrategy";
import { KuznyechikMessageEncryptionStrategy } from "@/application/messaging/KuznyechikMessageEncryptionStrategy";
import { SystemService } from "@/application/system/SystemService";
import { EncryptionMethod } from "@/domain/cryptography/EncryptionMethod";
import { bitLengthOf } from "@/domain/cryptography/primes/BigIntegerArithmetic";
import { CryptographicRandomIntegerSource } from "@/domain/cryptography/primes/CryptographicRandomIntegerSource";
import { RsaKeyPairAssembler } from "@/domain/cryptography/rsa/RsaKeyPairAssembler";
import { RsaStreebogDigitalSignature } from "@/domain/cryptography/rsa/RsaStreebogDigitalSignature";
import { TotpOneTimePasswordService } from "@/domain/identity/TotpOneTimePasswordService";
import {
  loadApplicationConfiguration,
  type ApplicationSecrets,
  type ApplicationSettings,
} from "@/infrastructure/config/loadApplicationConfiguration";
import { StreebogPasswordHasher } from "@/infrastructure/identity/StreebogPasswordHasher";
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
import { PrismaEncryptionMethodRepository } from "@/infrastructure/persistence/prisma/PrismaEncryptionMethodRepository";
import { PrismaPasswordResetTokenRepository } from "@/infrastructure/persistence/prisma/PrismaPasswordResetTokenRepository";
import { PrismaPendingLoginRepository } from "@/infrastructure/persistence/prisma/PrismaPendingLoginRepository";
import { getPrismaClient } from "@/infrastructure/persistence/prisma/PrismaClientSingleton";
import { PrismaRecoveryCodeRepository } from "@/infrastructure/persistence/prisma/PrismaRecoveryCodeRepository";
import { PrismaSessionRepository } from "@/infrastructure/persistence/prisma/PrismaSessionRepository";
import { PrismaSystemRsaKeyStore } from "@/infrastructure/persistence/prisma/PrismaSystemRsaKeyStore";
import { PrismaUserAccountRepository } from "@/infrastructure/persistence/prisma/PrismaUserAccountRepository";

/**
 * Собранные прикладные сервисы и загруженная конфигурация.
 */
export type ApplicationServices = {
  applicationSettings: ApplicationSettings;
  applicationSecrets: ApplicationSecrets;
  authenticationService: AuthenticationService;
  registrationService: RegistrationService;
  passwordResetService: PasswordResetService;
  messageService: MessageService;
  administrationService: AdministrationService;
  systemService: SystemService;
};

let servicesInstance: ApplicationServices | null = null;
let kafkaRsaAssemblerStarted = false;
let mailGatewayInstance: SmtpMailGateway | null = null;

/**
 * Возвращает синглтон прикладных сервисов, собирая его при первом вызове.
 * @returns Набор сервисов и конфигурации.
 */
function getServices(): ApplicationServices {
  if (servicesInstance) {
    return servicesInstance;
  }

  const { settings, secrets } = loadApplicationConfiguration();
  process.env.DATABASE_URL = settings.database.url;

  const randomIntegerSource = new CryptographicRandomIntegerSource();
  const userAccountRepository = new PrismaUserAccountRepository();
  const recoveryCodeRepository = new PrismaRecoveryCodeRepository();
  const emailOtpRepository = new PrismaEmailOtpRepository();
  const passwordResetTokenRepository = new PrismaPasswordResetTokenRepository();
  const pendingLoginRepository = new PrismaPendingLoginRepository();
  const sessionRepository = new PrismaSessionRepository();
  const encryptedMessageRepository = new PrismaEncryptedMessageRepository();
  const encryptionMethodRepository = new PrismaEncryptionMethodRepository();
  const systemRsaKeyStore = new PrismaSystemRsaKeyStore();
  const collectedPrimeNumberRepository = new PrismaCollectedPrimeNumberRepository();
  const passwordHasher = new StreebogPasswordHasher(randomIntegerSource);
  const mailGateway = new SmtpMailGateway({
    host: settings.smtp.host,
    port: settings.smtp.port,
    from: settings.smtp.from,
  });
  mailGatewayInstance = mailGateway;

  const registration = new RegistrationService(
    userAccountRepository,
    recoveryCodeRepository,
    passwordHasher,
    mailGateway,
    settings.mail.domain,
    settings.auth.totpIssuer,
    settings.auth.recoveryCodeCount,
    randomIntegerSource,
  );
  const authentication = new AuthenticationService(
    userAccountRepository,
    passwordHasher,
    pendingLoginRepository,
    emailOtpRepository,
    recoveryCodeRepository,
    sessionRepository,
    mailGateway,
    new TotpOneTimePasswordService(),
    settings.auth.emailOtpTtlSeconds,
    settings.auth.pendingLoginTtlMinutes,
    settings.auth.sessionTtlHours,
  );

  servicesInstance = {
    applicationSettings: settings,
    applicationSecrets: secrets,
    authenticationService: authentication,
    registrationService: registration,
    passwordResetService: new PasswordResetService(
      userAccountRepository,
      emailOtpRepository,
      passwordResetTokenRepository,
      passwordHasher,
      mailGateway,
      settings.auth.emailOtpTtlSeconds,
      settings.auth.passwordResetTtlMinutes,
    ),
    messageService: new MessageService(
      encryptedMessageRepository,
      encryptionMethodRepository,
      {
        [EncryptionMethod.RSA]: new RsaMessageEncryptionStrategy(
          collectedPrimeNumberRepository,
          new RsaKeyPairAssembler(),
          BigInt(settings.rsa.publicExponent),
          settings.rsa.modulusBitLength,
          randomIntegerSource,
        ),
        [EncryptionMethod.KUZNYECHIK]: new KuznyechikMessageEncryptionStrategy(randomIntegerSource),
      },
      systemRsaKeyStore,
      new RsaStreebogDigitalSignature(),
      new SignedPdfDocumentFactory(),
    ),
    administrationService: new AdministrationService(
      userAccountRepository,
      recoveryCodeRepository,
      encryptionMethodRepository,
      registration,
      passwordHasher,
      settings.auth.totpIssuer,
      settings.auth.recoveryCodeCount,
    ),
    systemService: new SystemService(
      systemRsaKeyStore,
      collectedPrimeNumberRepository,
      settings,
    ),
  };

  return servicesInstance;
}

/**
 * Инициализирует приложение и возвращает готовые сервисы.
 * @returns Набор сервисов после инициализации.
 */
export async function getReadyServices(): Promise<ApplicationServices> {
  await initializeApplication();
  return getServices();
}

async function publishDefaultAdminEnrollment(services: ApplicationServices): Promise<void> {
  const { enrollment, createdNow } = await readOrCreateAdminEnrollment(async () => {
    const enrollment = await services.administrationService.enrollDefaultAdmin(services.applicationSecrets.admin);
    if (enrollment.isError) {
      throw new Error(enrollment.error);
    }
    return enrollment.resultDto;
  });
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
    if (!mailGatewayInstance) {
      throw new Error("Почтовый шлюз ещё не собран.");
    }
    await sendAdminEnrollmentMail(mailGatewayInstance, enrollment, services.applicationSettings.mail.webmailUrl);
    markAdminEnrollmentMailSent();
    console.info(`TOTP и коды восстановления отправлены на ${enrollment.email}`);
  } catch (error) {
    console.warn("Не удалось отправить TOTP администратора на почту, повторю при следующем запросе:", error);
  }
}

/**
 * Подключает БД, обеспечивает методы шифрования и администратора по умолчанию; при несовпадении длины модуля RSA запускает сборку ключа из Kafka.
 * На фазе production-сборки Next.js ничего не делает.
 * @returns Ничего.
 */
export async function initializeApplication(): Promise<void> {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return;
  }

  const services = getServices();
  await getPrismaClient().$connect();
  await services.administrationService.ensureDefaultEncryptionMethods();
  await publishDefaultAdminEnrollment(services);
  const rehashed = await services.administrationService.rehashDefaultAdminPasswordIfNeeded(services.applicationSecrets.admin);
  if (rehashed) {
    console.info("Пароль администратора перехеширован Стрибог-512.");
  }

  const keyStore = new PrismaSystemRsaKeyStore();
  const keyPair = await keyStore.tryGetKeyPair();
  const { rsa, kafka } = services.applicationSettings;
  if ((!keyPair || bitLengthOf(keyPair.publicKey.modulus) !== rsa.modulusBitLength) && !kafkaRsaAssemblerStarted) {
    kafkaRsaAssemblerStarted = true;
    const assembler = new KafkaRsaKeyAssembler(
      {
        brokers: kafka.brokers,
        topic: kafka.topic,
        clientId: kafka.clientId,
        groupId: kafka.groupId,
      },
      new PrismaCollectedPrimeNumberRepository(),
      keyStore,
      new RsaKeyPairAssembler(),
      BigInt(rsa.publicExponent),
      rsa.modulusBitLength,
    );
    void assembler.start().catch((error: unknown) => {
      console.error("Не удалось запустить сборку RSA из Kafka:", error);
    });
  }
}
