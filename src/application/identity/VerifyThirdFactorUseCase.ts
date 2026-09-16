import { decodeBase32 } from "@/domain/identity/Base32Encoding";
import type { PendingLoginRepository } from "@/domain/identity/PendingLoginRepository";
import type { RecoveryCodeRepository } from "@/domain/identity/RecoveryCodeRepository";
import type { SessionRepository } from "@/domain/identity/SessionRepository";
import { TotpOneTimePasswordService } from "@/domain/identity/TotpOneTimePasswordService";
import type { UserAccountRepository } from "@/domain/identity/UserAccountRepository";
import { generateSessionToken, hashOpaqueSecret } from "@/infrastructure/identity/SecretDigest";

export type VerifyThirdFactorResult = {
  sessionToken: string;
  expiresAt: Date;
};

export class VerifyThirdFactorUseCase {
  public constructor(
    private readonly pendingLoginRepository: PendingLoginRepository,
    private readonly userAccountRepository: UserAccountRepository,
    private readonly recoveryCodeRepository: RecoveryCodeRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly totpService: TotpOneTimePasswordService,
    private readonly sessionTtlHours: number,
  ) {}

  public async execute(pendingLoginId: string, totpOrRecoveryCode: string): Promise<VerifyThirdFactorResult> {
    const pendingLogin = await this.pendingLoginRepository.findById(pendingLoginId);
    if (!pendingLogin || pendingLogin.expiresAt <= new Date() || !pendingLogin.emailVerified) {
      throw new Error("Сначала подтвердите пароль и код из письма.");
    }

    const user = await this.userAccountRepository.findById(pendingLogin.userId);
    if (!user) {
      throw new Error("Пользователь не найден.");
    }

    const presented = totpOrRecoveryCode.trim();
    const totpSecret = decodeBase32(user.totpSecretBase32);
    const totpAccepted = this.totpService.verifyCode(totpSecret, presented);
    const recoveryAccepted = totpAccepted
      ? false
      : await this.recoveryCodeRepository.consumeUnused(user.id, hashOpaqueSecret(presented.toUpperCase()));

    if (!totpAccepted && !recoveryAccepted) {
      throw new Error("Неверный TOTP или код восстановления.");
    }

    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + this.sessionTtlHours * 60 * 60 * 1000);
    await this.sessionRepository.create(user.id, hashOpaqueSecret(sessionToken), expiresAt);
    await this.pendingLoginRepository.delete(pendingLoginId);

    return { sessionToken, expiresAt };
  }
}
