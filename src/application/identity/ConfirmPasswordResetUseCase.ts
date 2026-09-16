import type { EmailOtpRepository } from "@/domain/identity/EmailOtpRepository";
import type { PasswordHasher } from "@/domain/identity/PasswordHasher";
import type { PasswordResetTokenRepository } from "@/domain/identity/PasswordResetTokenRepository";
import { RegistrationValidator } from "@/domain/identity/RegistrationValidator";
import type { UserAccountRepository } from "@/domain/identity/UserAccountRepository";
import { hashOpaqueSecret } from "@/infrastructure/identity/SecretDigest";

export class ConfirmPasswordResetUseCase {
  public constructor(
    private readonly userAccountRepository: UserAccountRepository,
    private readonly emailOtpRepository: EmailOtpRepository,
    private readonly passwordResetTokenRepository: PasswordResetTokenRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  public async execute(email: string, otpCode: string, resetToken: string, newPassword: string): Promise<void> {
    const passwordErrors = new RegistrationValidator().validate({
      login: "Valid_login",
      email: email.toLowerCase(),
      password: newPassword,
      passwordConfirmation: newPassword,
    });
    const passwordError = passwordErrors.find((error) => error.field === "password" || error.field === "email");
    if (passwordError) {
      throw new Error(passwordError.message);
    }

    const user = await this.userAccountRepository.findByEmail(email.toLowerCase());
    if (!user) {
      throw new Error("Не удалось сбросить пароль.");
    }

    const otpAccepted = await this.emailOtpRepository.consumeUnused(
      user.id,
      "PASSWORD_RESET",
      hashOpaqueSecret(otpCode.trim()),
      new Date(),
    );
    const tokenUserId = await this.passwordResetTokenRepository.consumeUnused(hashOpaqueSecret(resetToken.trim()), new Date());
    if (!otpAccepted || tokenUserId !== user.id) {
      throw new Error("Неверный код письма или токен сброса.");
    }

    const passwordHash = await this.passwordHasher.hash(newPassword);
    await this.userAccountRepository.updatePassword(user.id, passwordHash);
  }
}
