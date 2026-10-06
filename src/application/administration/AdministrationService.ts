import type { EncryptionMethod } from "@/domain/cryptography/EncryptionMethod";
import { EncryptionMethod as EncryptionMethodValue } from "@/domain/cryptography/EncryptionMethod";
import type { IEncryptionMethodRepository } from "@/domain/access/IEncryptionMethodRepository";
import type { IMailGateway } from "@/domain/identity/IMailGateway";
import type { IPasswordHasher } from "@/domain/identity/IPasswordHasher";
import type { IRecoveryCodeRepository } from "@/domain/identity/IRecoveryCodeRepository";
import type { UserAccount } from "@/domain/identity/UserAccount";
import type { IUserAccountRepository } from "@/domain/identity/IUserAccountRepository";
import type { UserRole } from "@/domain/identity/UserRole";
import { UserRole as UserRoleValue } from "@/domain/identity/UserRole";
import { issueRecoveryCodes } from "@/application/identity/IdentitySecrets";
import type { RegistrationService } from "@/application/identity/RegistrationService";
import { fail, ok, type Result } from "@/domain/Result";

/**
 * Коды восстановления администратора по умолчанию.
 */
export type DefaultAdminEnrollment = {
  created: boolean;
  email: string;
  login: string;
  recoveryCodes: string[];
};

/**
 * Администрирование пользователей, методов шифрования и учётной записи администратора по умолчанию.
 */
export class AdministrationService {
  public constructor(
    private readonly userAccountRepository: IUserAccountRepository,
    private readonly recoveryCodeRepository: IRecoveryCodeRepository,
    private readonly encryptionMethodRepository: IEncryptionMethodRepository,
    private readonly registrationService: RegistrationService,
    private readonly passwordHasher: IPasswordHasher,
    private readonly recoveryCodeCount: number,
  ) {}

  /**
   * Возвращает методы шифрования и признак включения.
   */
  public async getAllEncryptionMethods(): Promise<Array<{ method: EncryptionMethod; enabled: boolean }>> {
    return this.encryptionMethodRepository.list();
  }

  /**
   * Включает RSA и «Кузнечик», если список методов пуст.
   */
  public async ensureDefaultEncryptionMethods(): Promise<void> {
    const existingMethods = await this.encryptionMethodRepository.list();
    if (existingMethods.length > 0) {
      return;
    }
    await this.encryptionMethodRepository.setEnabled(EncryptionMethodValue.RSA, true);
    await this.encryptionMethodRepository.setEnabled(EncryptionMethodValue.KUZNYECHIK, true);
  }

  /**
   * Включает или отключает метод шифрования. Доступно администратору.
   * @param actor Текущий пользователь.
   * @param method Метод шифрования.
   * @param enabled Признак включения.
   */
  public async setEncryptionMethodEnabled(
    actor: UserAccount,
    method: EncryptionMethod,
    enabled: boolean,
  ): Promise<Result<void>> {
    const access = this.requireAdmin(actor);
    if (access.isError) {
      return access;
    }
    await this.encryptionMethodRepository.setEnabled(method, enabled);
    return ok(undefined);
  }

  /**
   * Возвращает все учётные записи. Доступно администратору.
   * @param actor Текущий пользователь.
   */
  public async getAllUsers(actor: UserAccount): Promise<Result<UserAccount[]>> {
    const access = this.requireAdmin(actor);
    if (access.isError) {
      return access;
    }
    return ok(await this.userAccountRepository.listAll());
  }

  /**
   * Создаёт учётную запись от имени администратора.
   * @param actor Текущий пользователь.
   * @param values Поля новой учётной записи.
   */
  public async createUserAccount(
    actor: UserAccount,
    values: {
      login: string;
      email: string;
      password: string;
      passwordConfirmation: string;
      role: UserRole;
    },
  ) {
    const access = this.requireAdmin(actor);
    if (access.isError) {
      return access;
    }
    return this.registrationService.registerUser(values, values.role);
  }

  /**
   * Создаёт администратора по умолчанию или выпускает новые коды восстановления для существующего.
   * @param admin Логин, почта и пароль из настроек.
   */
  public async enrollDefaultAdmin(admin: {
    login: string;
    email: string;
    password: string;
  }): Promise<Result<DefaultAdminEnrollment>> {
    const existing = await this.userAccountRepository.findByLogin(admin.login);
    if (!existing) {
      const enrollment = await this.registrationService.registerUser(
        {
          login: admin.login,
          email: admin.email,
          password: admin.password,
          passwordConfirmation: admin.password,
        },
        UserRoleValue.ADMIN,
      );
      if (enrollment.isError) {
        return enrollment;
      }
      return ok({
        created: true,
        email: admin.email.toLowerCase(),
        login: admin.login,
        recoveryCodes: enrollment.resultDto.recoveryCodes,
      });
    }

    const recoveryCodes = await issueRecoveryCodes(this.recoveryCodeRepository, existing.id, this.recoveryCodeCount);

    return ok({
      created: false,
      email: existing.email,
      login: existing.login,
      recoveryCodes,
    });
  }

  /**
   * Пересчитывает хэш пароля администратора по умолчанию, если он не совпадает с настройками.
   * @param admin Логин и пароль из настроек.
   * @returns `true`, если хэш обновлён.
   */
  public async rehashDefaultAdminPasswordIfNeeded(admin: { login: string; password: string }): Promise<boolean> {
    const account = await this.userAccountRepository.findByLogin(admin.login);
    if (!account) {
      return false;
    }
    const storedHash = await this.userAccountRepository.getPasswordHash(account.id);
    const passwordMatches = await this.passwordHasher.verify(admin.password, storedHash);
    if (passwordMatches) {
      return false;
    }
    await this.userAccountRepository.updatePassword(account.id, await this.passwordHasher.hash(admin.password));
    return true;
  }

  /**
   * Проверяет, что пользователь имеет роль администратора.
   * @param actor Текущий пользователь.
   */
  private requireAdmin(actor: UserAccount): Result<void> {
    if (actor.role !== UserRoleValue.ADMIN) {
      return fail("Только администратор.");
    }
    return ok(undefined);
  }
}

/**
 * Текст письма с кодами восстановления администратора.
 * @param enrollment Данные зачисления.
 * @param webmailUrl Адрес веб-почты.
 */
function formatAdminEnrollmentMailBody(enrollment: DefaultAdminEnrollment, webmailUrl: string): string {
  const previousCodesNote = enrollment.created
    ? "Сохраните коды: они больше не хранятся открытым текстом."
    : "Предыдущие коды восстановления больше не действуют — ниже новые.";
  return [
    `Здравствуйте, ${enrollment.login}.`,
    "",
    "Коды восстановления администратора приложения InformationSecurity.",
    previousCodesNote,
    "",
    `Логин: ${enrollment.login}`,
    "",
    "Коды восстановления:",
    ...enrollment.recoveryCodes.map((code) => `- ${code}`),
    "",
    `Веб-почта: ${webmailUrl}`,
    "",
  ].join("\n");
}

/**
 * Отправляет письмо с кодами восстановления администратора.
 * @param mailGateway Почтовый шлюз.
 * @param enrollment Данные зачисления.
 * @param webmailUrl Адрес веб-почты.
 */
export async function sendAdminEnrollmentMail(
  mailGateway: IMailGateway,
  enrollment: DefaultAdminEnrollment,
  webmailUrl: string,
): Promise<void> {
  await mailGateway.send(
    enrollment.email,
    "Администратор InformationSecurity: коды восстановления",
    formatAdminEnrollmentMailBody(enrollment, webmailUrl),
  );
}
