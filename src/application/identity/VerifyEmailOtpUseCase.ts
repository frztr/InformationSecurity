import type { EmailOtpRepository } from "@/domain/identity/EmailOtpRepository";
import type { PendingLoginRepository } from "@/domain/identity/PendingLoginRepository";
import { hashOpaqueSecret } from "@/infrastructure/identity/SecretDigest";

export class VerifyEmailOtpUseCase {
  public constructor(
    private readonly pendingLoginRepository: PendingLoginRepository,
    private readonly emailOtpRepository: EmailOtpRepository,
  ) {}

  public async execute(pendingLoginId: string, otpCode: string): Promise<void> {
    const pendingLogin = await this.pendingLoginRepository.findById(pendingLoginId);
    if (!pendingLogin || pendingLogin.expiresAt <= new Date()) {
      throw new Error("Сессия входа истекла. Начните вход заново.");
    }

    const accepted = await this.emailOtpRepository.consumeUnused(
      pendingLogin.userId,
      "LOGIN",
      hashOpaqueSecret(otpCode.trim()),
      new Date(),
    );
    if (!accepted) {
      throw new Error("Неверный или просроченный код из письма.");
    }

    await this.pendingLoginRepository.markEmailVerified(pendingLoginId);
  }
}
