import type { EmailOtpRepository } from "@/domain/identity/EmailOtpRepository";
import type { MailGateway } from "@/domain/identity/MailGateway";
import type { PasswordHasher } from "@/domain/identity/PasswordHasher";
import type { PendingLoginRepository } from "@/domain/identity/PendingLoginRepository";
import type { UserAccountRepository } from "@/domain/identity/UserAccountRepository";
import { generateDecimalOtp, hashOpaqueSecret } from "@/infrastructure/identity/SecretDigest";

export type LoginPasswordResult = {
  pendingLoginId: string;
  emailHint: string;
};

export class LoginPasswordUseCase {
  public constructor(
    private readonly userAccountRepository: UserAccountRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly pendingLoginRepository: PendingLoginRepository,
    private readonly emailOtpRepository: EmailOtpRepository,
    private readonly mailGateway: MailGateway,
    private readonly emailOtpTtlSeconds: number,
    private readonly pendingLoginTtlMinutes: number,
  ) {}

  public async execute(login: string, password: string): Promise<LoginPasswordResult> {
    const user = await this.userAccountRepository.findByLogin(login);
    if (!user) {
      throw new Error("Неверный логин или пароль.");
    }

    const storedHash = await this.userAccountRepository.getPasswordHash(user.id);
    const passwordMatches = await this.passwordHasher.verify(password, storedHash);
    if (!passwordMatches) {
      throw new Error("Неверный логин или пароль.");
    }

    const pendingLogin = await this.pendingLoginRepository.create(
      user.id,
      new Date(Date.now() + this.pendingLoginTtlMinutes * 60 * 1000),
    );
    const otpCode = generateDecimalOtp(6);
    await this.emailOtpRepository.create(
      user.id,
      "LOGIN",
      hashOpaqueSecret(otpCode),
      new Date(Date.now() + this.emailOtpTtlSeconds * 1000),
    );
    await this.mailGateway.send(
      user.email,
      "Код входа (2-й фактор 3FA)",
      `Код для входа: ${otpCode}\nОн действует ${Math.floor(this.emailOtpTtlSeconds / 60)} мин.\n`,
    );

    return {
      pendingLoginId: pendingLogin.id,
      emailHint: this.maskEmail(user.email),
    };
  }

  private maskEmail(email: string): string {
    const [localPart, domain] = email.split("@");
    const visible = localPart.slice(0, 2);
    return `${visible}***@${domain}`;
  }
}
