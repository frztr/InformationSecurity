import QRCode from "qrcode";
import { issueRecoveryCodes } from "@/application/identity/IdentitySecrets";
import type { IRandomIntegerSource } from "@/domain/cryptography/primes/IRandomIntegerSource";
import { buildOtpAuthUrl, encodeBase32 } from "@/domain/identity/Base32Encoding";
import type { IMailGateway } from "@/domain/identity/IMailGateway";
import type { IPasswordHasher } from "@/domain/identity/IPasswordHasher";
import type { IRecoveryCodeRepository } from "@/domain/identity/IRecoveryCodeRepository";
import { RegistrationValidator, type RegistrationFormValues } from "@/domain/identity/RegistrationValidator";
import type { IUserAccountRepository } from "@/domain/identity/IUserAccountRepository";
import { UserRole } from "@/domain/identity/UserRole";
import { fail, ok, type Result } from "@/domain/Result";

/**
 * Данные третьего фактора после регистрации.
 */
export type RegisterUserResult = {
  userId: string;
  otpAuthUrl: string;
  totpSecretBase32: string;
  recoveryCodes: string[];
  qrDataUrl: string;
};

/**
 * Регистрация учётной записи, выдача TOTP-секрета и кодов восстановления.
 */
export class RegistrationService {
  public constructor(
    private readonly userAccountRepository: IUserAccountRepository,
    private readonly recoveryCodeRepository: IRecoveryCodeRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly mailGateway: IMailGateway,
    private readonly mailDomain: string,
    private readonly totpIssuer: string,
    private readonly recoveryCodeCount: number,
    private readonly randomIntegerSource: IRandomIntegerSource,
  ) {}

  /**
   * Создаёт учётную запись, если поля и домен почты корректны, логин и почта свободны.
   * @param values Поля регистрации.
   * @param role Назначаемая роль.
   */
  public async registerUser(
    values: RegistrationFormValues,
    role: (typeof UserRole)[keyof typeof UserRole] = UserRole.USER,
  ): Promise<Result<RegisterUserResult>> {
    const errors = new RegistrationValidator().validate(values);
    if (errors.length > 0) {
      return fail(errors.map((error) => error.message).join(" "));
    }

    const email = values.email.toLowerCase();
    const expectedSuffix = `@${this.mailDomain.toLowerCase()}`;
    if (!email.endsWith(expectedSuffix)) {
      return fail(`Почта должна быть на домене ${this.mailDomain}. Сначала заведите ящик в почтовом сервере.`);
    }

    const existingLogin = await this.userAccountRepository.findByLogin(values.login);
    if (existingLogin) {
      return fail("Пользователь с таким логином уже существует.");
    }
    const existingEmail = await this.userAccountRepository.findByEmail(email);
    if (existingEmail) {
      return fail("Пользователь с такой почтой уже существует.");
    }

    const totpSecret = this.randomIntegerSource.nextBytes(20);
    const totpSecretBase32 = encodeBase32(totpSecret);
    const passwordHash = await this.passwordHasher.hash(values.password);
    const user = await this.userAccountRepository.insert({
      login: values.login,
      email,
      role,
      passwordHash,
      totpSecretBase32,
    });

    const recoveryCodes = await issueRecoveryCodes(this.recoveryCodeRepository, user.id, this.recoveryCodeCount);

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

    return ok({
      userId: user.id,
      otpAuthUrl,
      totpSecretBase32,
      recoveryCodes,
      qrDataUrl,
    });
  }
}
