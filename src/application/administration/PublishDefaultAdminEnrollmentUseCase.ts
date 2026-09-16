import { buildOtpAuthUrl } from "@/domain/identity/Base32Encoding";
import type { MailGateway } from "@/domain/identity/MailGateway";
import type { RecoveryCodeRepository } from "@/domain/identity/RecoveryCodeRepository";
import type { UserAccountRepository } from "@/domain/identity/UserAccountRepository";
import { UserRole } from "@/domain/identity/UserRole";
import type { RegisterUserUseCase } from "@/application/identity/RegisterUserUseCase";
import { generateRecoveryCode, hashOpaqueSecret } from "@/infrastructure/identity/SecretDigest";

export type DefaultAdminEnrollment = {
  created: boolean;
  email: string;
  login: string;
  totpSecretBase32: string;
  otpAuthUrl: string;
  recoveryCodes: string[];
};

export class PublishDefaultAdminEnrollmentUseCase {
  public constructor(
    private readonly userAccountRepository: UserAccountRepository,
    private readonly recoveryCodeRepository: RecoveryCodeRepository,
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly totpIssuer: string,
    private readonly recoveryCodeCount: number,
  ) {}

  public async execute(admin: { login: string; email: string; password: string }): Promise<DefaultAdminEnrollment> {
    const existing = await this.userAccountRepository.findByLogin(admin.login);
    if (!existing) {
      const enrollment = await this.registerUserUseCase.execute(
        {
          login: admin.login,
          email: admin.email,
          password: admin.password,
          passwordConfirmation: admin.password,
        },
        UserRole.ADMIN,
      );
      return {
        created: true,
        email: admin.email.toLowerCase(),
        login: admin.login,
        totpSecretBase32: enrollment.totpSecretBase32,
        otpAuthUrl: enrollment.otpAuthUrl,
        recoveryCodes: enrollment.recoveryCodes,
      };
    }

    const recoveryCodes = Array.from({ length: this.recoveryCodeCount }, () => generateRecoveryCode());
    await this.recoveryCodeRepository.replaceAll(
      existing.id,
      recoveryCodes.map((code) => hashOpaqueSecret(code)),
    );

    return {
      created: false,
      email: existing.email,
      login: existing.login,
      totpSecretBase32: existing.totpSecretBase32,
      otpAuthUrl: buildOtpAuthUrl(this.totpIssuer, existing.login, existing.totpSecretBase32),
      recoveryCodes,
    };
  }
}

export function formatAdminEnrollmentMailBody(enrollment: DefaultAdminEnrollment, webmailUrl: string): string {
  const previousCodesNote = enrollment.created
    ? "Сохраните коды: они больше не хранятся открытым текстом."
    : "Предыдущие коды восстановления больше не действуют — ниже новые.";
  return [
    `Здравствуйте, ${enrollment.login}.`,
    "",
    "Секрет третьего фактора администратора приложения InformationSecurity.",
    previousCodesNote,
    "",
    `Логин: ${enrollment.login}`,
    `TOTP secret: ${enrollment.totpSecretBase32}`,
    `OTPAuth: ${enrollment.otpAuthUrl}`,
    "",
    "Коды восстановления:",
    ...enrollment.recoveryCodes.map((code) => `- ${code}`),
    "",
    `Веб-почта: ${webmailUrl}`,
    "",
  ].join("\n");
}

export async function sendAdminEnrollmentMail(
  mailGateway: MailGateway,
  enrollment: DefaultAdminEnrollment,
  webmailUrl: string,
): Promise<void> {
  await mailGateway.send(
    enrollment.email,
    "Администратор InformationSecurity: TOTP и коды восстановления",
    formatAdminEnrollmentMailBody(enrollment, webmailUrl),
  );
}
