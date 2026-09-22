import { consumeEmailOtp, issueEmailOtp } from "@/application/identity/IdentitySecrets";
import type { IEmailOtpRepository } from "@/domain/identity/IEmailOtpRepository";
import type { IMailGateway } from "@/domain/identity/IMailGateway";
import type { IPasswordHasher } from "@/domain/identity/IPasswordHasher";
import type { IPasswordResetTokenRepository } from "@/domain/identity/IPasswordResetTokenRepository";
import { RegistrationValidator } from "@/domain/identity/RegistrationValidator";
import type { IUserAccountRepository } from "@/domain/identity/IUserAccountRepository";
import { fail, ok, type Result } from "@/domain/Result";
import { generateSessionToken, hashOpaqueSecret } from "@/infrastructure/identity/SecretDigest";

/**
 * Запрос и подтверждение сброса пароля по коду из письма и токену.
 */
export class PasswordResetService {
  public constructor(
    private readonly userAccountRepository: IUserAccountRepository,
    private readonly emailOtpRepository: IEmailOtpRepository,
    private readonly passwordResetTokenRepository: IPasswordResetTokenRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly mailGateway: IMailGateway,
    private readonly emailOtpTtlSeconds: number,
    private readonly passwordResetTtlMinutes: number,
  ) {}

  /**
   * Если адрес есть в системе, отправляет код и токен сброса. Иначе ничего не делает.
   * @param email Адрес электронной почты.
   */
  public async requestPasswordReset(email: string): Promise<void> {
    const user = await this.userAccountRepository.findByEmail(email.toLowerCase());
    if (!user) {
      return;
    }

    const otpCode = await issueEmailOtp(
      this.emailOtpRepository,
      user.id,
      "PASSWORD_RESET",
      this.emailOtpTtlSeconds,
    );
    const resetToken = generateSessionToken();
    await this.passwordResetTokenRepository.create(
      user.id,
      hashOpaqueSecret(resetToken),
      new Date(Date.now() + this.passwordResetTtlMinutes * 60 * 1000),
    );

    await this.mailGateway.send(
      user.email,
      "Восстановление пароля",
      `Код подтверждения: ${otpCode}\nТокен сброса: ${resetToken}\n\nЕсли вы не запрашивали сброс, проигнорируйте письмо.\n`,
    );
  }

  /**
   * Проверяет код, токен и новый пароль, затем заменяет хэш.
   * @param email Адрес электронной почты.
   * @param otpCode Код из письма.
   * @param resetToken Токен сброса.
   * @param newPassword Новый пароль.
   */
  public async confirmPasswordReset(
    email: string,
    otpCode: string,
    resetToken: string,
    newPassword: string,
  ): Promise<Result<void>> {
    const passwordErrors = new RegistrationValidator().validate({
      login: "Valid_login",
      email: email.toLowerCase(),
      password: newPassword,
      passwordConfirmation: newPassword,
    });
    const passwordError = passwordErrors.find((error) => error.field === "password" || error.field === "email");
    if (passwordError) {
      return fail(passwordError.message);
    }

    const user = await this.userAccountRepository.findByEmail(email.toLowerCase());
    if (!user) {
      return fail("Не удалось сбросить пароль.");
    }

    const otpAccepted = await consumeEmailOtp(this.emailOtpRepository, user.id, "PASSWORD_RESET", otpCode);
    const tokenUserId = await this.passwordResetTokenRepository.consumeUnused(hashOpaqueSecret(resetToken.trim()), new Date());
    if (!otpAccepted || tokenUserId !== user.id) {
      return fail("Неверный код письма или токен сброса.");
    }

    const passwordHash = await this.passwordHasher.hash(newPassword);
    await this.userAccountRepository.updatePassword(user.id, passwordHash);
    return ok(undefined);
  }
}
