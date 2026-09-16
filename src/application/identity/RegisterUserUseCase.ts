import { randomBytes } from "node:crypto";
import QRCode from "qrcode";
import { buildOtpAuthUrl, encodeBase32 } from "@/domain/identity/Base32Encoding";
import type { MailGateway } from "@/domain/identity/MailGateway";
import type { PasswordHasher } from "@/domain/identity/PasswordHasher";
import type { RecoveryCodeRepository } from "@/domain/identity/RecoveryCodeRepository";
import { RegistrationValidator, type RegistrationFormValues } from "@/domain/identity/RegistrationValidator";
import type { UserAccountRepository } from "@/domain/identity/UserAccountRepository";
import { UserRole } from "@/domain/identity/UserRole";
import { generateRecoveryCode, hashOpaqueSecret } from "@/infrastructure/identity/SecretDigest";

export type RegisterUserResult = {
  userId: string;
  otpAuthUrl: string;
  totpSecretBase32: string;
  recoveryCodes: string[];
  qrDataUrl: string;
};

export class RegisterUserUseCase {
  public constructor(
    private readonly userAccountRepository: UserAccountRepository,
    private readonly recoveryCodeRepository: RecoveryCodeRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly mailGateway: MailGateway,
    private readonly mailDomain: string,
    private readonly totpIssuer: string,
    private readonly recoveryCodeCount: number,
  ) {}

  public async execute(
    values: RegistrationFormValues,
    role: (typeof UserRole)[keyof typeof UserRole] = UserRole.USER,
  ): Promise<RegisterUserResult> {
    const errors = new RegistrationValidator().validate(values);
    if (errors.length > 0) {
      throw new Error(errors.map((error) => error.message).join(" "));
    }

    const email = values.email.toLowerCase();
    const expectedSuffix = `@${this.mailDomain.toLowerCase()}`;
    if (!email.endsWith(expectedSuffix)) {
      throw new Error(`Почта должна быть на домене ${this.mailDomain}. Сначала заведите ящик в почтовом сервере.`);
    }

    const existingLogin = await this.userAccountRepository.findByLogin(values.login);
    if (existingLogin) {
      throw new Error("Пользователь с таким логином уже существует.");
    }
    const existingEmail = await this.userAccountRepository.findByEmail(email);
    if (existingEmail) {
      throw new Error("Пользователь с такой почтой уже существует.");
    }

    const totpSecret = randomBytes(20);
    const totpSecretBase32 = encodeBase32(totpSecret);
    const passwordHash = await this.passwordHasher.hash(values.password);
    const user = await this.userAccountRepository.insert({
      login: values.login,
      email,
      role,
      passwordHash,
      totpSecretBase32,
    });

    const recoveryCodes = Array.from({ length: this.recoveryCodeCount }, () => generateRecoveryCode());
    await this.recoveryCodeRepository.replaceAll(
      user.id,
      recoveryCodes.map((code) => hashOpaqueSecret(code)),
    );

    const otpAuthUrl = buildOtpAuthUrl(this.totpIssuer, values.login, totpSecretBase32);
    const qrDataUrl = await QRCode.toDataURL(otpAuthUrl, { margin: 1, width: 220 });
    try {
      await this.mailGateway.send(
        user.email,
        "Регистрация в InformationSecurity",
        `Здравствуйте, ${user.login}.\n\nУчётная запись создана. Сохраните коды восстановления, показанные в браузере, и привяжите TOTP-приложение.\n`,
      );
    } catch (error) {
      console.warn("Не удалось отправить письмо о регистрации:", error);
    }

    return {
      userId: user.id,
      otpAuthUrl,
      totpSecretBase32,
      recoveryCodes,
      qrDataUrl,
    };
  }
}
