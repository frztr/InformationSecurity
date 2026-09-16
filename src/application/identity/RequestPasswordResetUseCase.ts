import type { EmailOtpRepository } from "@/domain/identity/EmailOtpRepository";
import type { MailGateway } from "@/domain/identity/MailGateway";
import type { PasswordResetTokenRepository } from "@/domain/identity/PasswordResetTokenRepository";
import type { UserAccountRepository } from "@/domain/identity/UserAccountRepository";
import { generateDecimalOtp, generateSessionToken, hashOpaqueSecret } from "@/infrastructure/identity/SecretDigest";

export class RequestPasswordResetUseCase {
  public constructor(
    private readonly userAccountRepository: UserAccountRepository,
    private readonly emailOtpRepository: EmailOtpRepository,
    private readonly passwordResetTokenRepository: PasswordResetTokenRepository,
    private readonly mailGateway: MailGateway,
    private readonly emailOtpTtlSeconds: number,
    private readonly passwordResetTtlMinutes: number,
  ) {}

  public async execute(email: string): Promise<void> {
    const user = await this.userAccountRepository.findByEmail(email.toLowerCase());
    if (!user) {
      return;
    }

    const otpCode = generateDecimalOtp(6);
    const resetToken = generateSessionToken();
    await this.emailOtpRepository.create(
      user.id,
      "PASSWORD_RESET",
      hashOpaqueSecret(otpCode),
      new Date(Date.now() + this.emailOtpTtlSeconds * 1000),
    );
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
}
