import { consumeEmailOtp, issueEmailOtp } from "@/application/identity/IdentitySecrets";
import { decodeBase32 } from "@/domain/identity/Base32Encoding";
import type { IEmailOtpRepository } from "@/domain/identity/IEmailOtpRepository";
import type { IMailGateway } from "@/domain/identity/IMailGateway";
import type { IPasswordHasher } from "@/domain/identity/IPasswordHasher";
import type { IPendingLoginRepository } from "@/domain/identity/IPendingLoginRepository";
import type { IRecoveryCodeRepository } from "@/domain/identity/IRecoveryCodeRepository";
import type { ISessionRepository } from "@/domain/identity/ISessionRepository";
import { TotpOneTimePasswordService } from "@/domain/identity/TotpOneTimePasswordService";
import type { UserAccount } from "@/domain/identity/UserAccount";
import type { IUserAccountRepository } from "@/domain/identity/IUserAccountRepository";
import { fail, fromThrowable, ok, type Result } from "@/domain/Result";
import { generateSessionToken, hashOpaqueSecret } from "@/infrastructure/identity/SecretDigest";

/**
 * Результат первого шага входа: проверка пароля.
 */
export type LoginPasswordResult = {
  pendingLoginId: string;
  emailHint: string;
};

/**
 * Результат третьего фактора: выданный сеанс.
 */
export type VerifyThirdFactorResult = {
  sessionToken: string;
  expiresAt: Date;
};

/**
 * Вход по схеме 3FA: пароль, код из письма, TOTP или код восстановления.
 */
export class AuthenticationService {
  public constructor(
    private readonly userAccountRepository: IUserAccountRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly pendingLoginRepository: IPendingLoginRepository,
    private readonly emailOtpRepository: IEmailOtpRepository,
    private readonly recoveryCodeRepository: IRecoveryCodeRepository,
    private readonly sessionRepository: ISessionRepository,
    private readonly mailGateway: IMailGateway,
    private readonly totpService: TotpOneTimePasswordService,
    private readonly emailOtpTtlSeconds: number,
    private readonly pendingLoginTtlMinutes: number,
    private readonly sessionTtlHours: number,
  ) {}

  /**
   * Проверяет логин и пароль, создаёт незавершённый вход и отправляет код на почту.
   * @param login Логин.
   * @param password Пароль.
   */
  public async loginWithPassword(login: string, password: string): Promise<Result<LoginPasswordResult>> {
    const user = await this.userAccountRepository.findByLogin(login);
    if (!user) {
      return fail("Неверный логин или пароль.");
    }

    const storedHash = await this.userAccountRepository.getPasswordHash(user.id);
    const passwordMatches = await this.passwordHasher.verify(password, storedHash);
    if (!passwordMatches) {
      return fail("Неверный логин или пароль.");
    }

    const pendingLogin = await this.pendingLoginRepository.create(
      user.id,
      new Date(Date.now() + this.pendingLoginTtlMinutes * 60 * 1000),
    );
    const otpCode = await issueEmailOtp(this.emailOtpRepository, user.id, "LOGIN", this.emailOtpTtlSeconds);
    await this.mailGateway.send(
      user.email,
      "Код входа (2-й фактор 3FA)",
      `Код для входа: ${otpCode}\nОн действует ${Math.floor(this.emailOtpTtlSeconds / 60)} мин.\n`,
    );

    return ok({
      pendingLoginId: pendingLogin.id,
      emailHint: maskEmail(user.email),
    });
  }

  /**
   * Проверяет одноразовый код из письма (второй фактор).
   * @param pendingLoginId Идентификатор незавершённого входа.
   * @param otpCode Код из письма.
   */
  public async verifyEmailOtp(pendingLoginId: string, otpCode: string): Promise<Result<void>> {
    const pendingLogin = await this.pendingLoginRepository.findById(pendingLoginId);
    if (!pendingLogin || pendingLogin.expiresAt <= new Date()) {
      return fail("Сессия входа истекла. Начните вход заново.");
    }

    const accepted = await consumeEmailOtp(this.emailOtpRepository, pendingLogin.userId, "LOGIN", otpCode);
    if (!accepted) {
      return fail("Неверный или просроченный код из письма.");
    }

    await this.pendingLoginRepository.markEmailVerified(pendingLoginId);
    return ok(undefined);
  }

  /**
   * Проверяет TOTP или код восстановления и выдаёт сеанс.
   * @param pendingLoginId Идентификатор незавершённого входа.
   * @param totpOrRecoveryCode Код TOTP или восстановления.
   */
  public async verifyThirdFactor(
    pendingLoginId: string,
    totpOrRecoveryCode: string,
  ): Promise<Result<VerifyThirdFactorResult>> {
    const pendingLogin = await this.pendingLoginRepository.findById(pendingLoginId);
    if (!pendingLogin || pendingLogin.expiresAt <= new Date() || !pendingLogin.emailVerified) {
      return fail("Сначала подтвердите пароль и код из письма.");
    }

    const user = await this.userAccountRepository.findById(pendingLogin.userId);
    if (!user) {
      return fail("Пользователь не найден.");
    }

    const presented = totpOrRecoveryCode.trim();
    const totpSecret = fromThrowable(() => decodeBase32(user.totpSecretBase32), "Некорректный секрет TOTP.");
    if (totpSecret.isError) {
      return totpSecret;
    }

    const totpAccepted = this.totpService.verifyCode(totpSecret.resultDto, presented);
    const recoveryAccepted = totpAccepted
      ? false
      : await this.recoveryCodeRepository.consumeUnused(user.id, hashOpaqueSecret(presented.toUpperCase()));

    if (!totpAccepted && !recoveryAccepted) {
      return fail("Неверный TOTP или код восстановления.");
    }

    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + this.sessionTtlHours * 60 * 60 * 1000);
    await this.sessionRepository.create(user.id, hashOpaqueSecret(sessionToken), expiresAt);
    await this.pendingLoginRepository.delete(pendingLoginId);

    return ok({ sessionToken, expiresAt });
  }

  /**
   * Возвращает пользователя по токену сеанса.
   * @param sessionToken Токен из cookie или `undefined`.
   * @returns Учётная запись или `null`.
   */
  public async getUserBySessionToken(sessionToken: string | undefined): Promise<UserAccount | null> {
    if (!sessionToken) {
      return null;
    }
    const session = await this.sessionRepository.findByTokenHash(hashOpaqueSecret(sessionToken));
    if (!session) {
      return null;
    }
    return this.userAccountRepository.findById(session.userId);
  }

  /**
   * Завершает сеанс.
   * @param sessionToken Токен из cookie или `undefined`.
   */
  public async logout(sessionToken: string | undefined): Promise<void> {
    if (!sessionToken) {
      return;
    }
    await this.sessionRepository.deleteByTokenHash(hashOpaqueSecret(sessionToken));
  }
}

function maskEmail(email: string): string {
  const [localPart, domain] = email.split("@");
  const visible = localPart.slice(0, 2);
  return `${visible}***@${domain}`;
}
