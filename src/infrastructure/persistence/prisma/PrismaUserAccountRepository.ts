import type { NewUserAccount, IUserAccountRepository } from "@/domain/identity/IUserAccountRepository";
import type { PasswordHash } from "@/domain/identity/PasswordHash";
import type { UserAccount } from "@/domain/identity/UserAccount";
import type { UserRole } from "@/domain/identity/UserRole";
import { getPrismaClient } from "@/infrastructure/persistence/prisma/PrismaClientSingleton";

/**
 * Реализация IUserAccountRepository на Prisma.
 */
export class PrismaUserAccountRepository implements IUserAccountRepository {
  /**
   * Ищет учётную запись по логину.
   * @param login Логин.
   * @returns Учётная запись или null.
   */
  public async findByLogin(login: string): Promise<UserAccount | null> {
    const record = await getPrismaClient().user.findUnique({ where: { login } });
    return record ? this.map(record) : null;
  }

  /**
   * Ищет учётную запись по почте.
   * @param email Адрес почты.
   * @returns Учётная запись или null.
   */
  public async findByEmail(email: string): Promise<UserAccount | null> {
    const record = await getPrismaClient().user.findUnique({ where: { email } });
    return record ? this.map(record) : null;
  }

  /**
   * Ищет учётную запись по идентификатору.
   * @param userId Идентификатор пользователя.
   * @returns Учётная запись или null.
   */
  public async findById(userId: string): Promise<UserAccount | null> {
    const record = await getPrismaClient().user.findUnique({ where: { id: userId } });
    return record ? this.map(record) : null;
  }

  /**
   * Возвращает все учётные записи по возрастанию createdAt.
   * @returns Список учётных записей.
   */
  public async listAll(): Promise<UserAccount[]> {
    const records = await getPrismaClient().user.findMany({ orderBy: { createdAt: "asc" } });
    return records.map((record) => this.map(record));
  }

  /**
   * Создаёт учётную запись.
   * @param newUser Данные новой записи, включая хэш пароля.
   * @returns Созданная учётная запись.
   */
  public async insert(newUser: NewUserAccount): Promise<UserAccount> {
    const record = await getPrismaClient().user.create({
      data: {
        login: newUser.login,
        email: newUser.email,
        role: newUser.role,
        passwordHash: newUser.passwordHash.hashHex,
        passwordSalt: newUser.passwordHash.saltHex,
      },
    });
    return this.map(record);
  }

  /**
   * Возвращает хэш пароля; алгоритм всегда streebog512.
   * @param userId Идентификатор пользователя.
   * @returns Соль и хэш в hex.
   */
  public async getPasswordHash(userId: string): Promise<PasswordHash> {
    const record = await getPrismaClient().user.findUniqueOrThrow({ where: { id: userId } });
    return {
      algorithm: "streebog512",
      saltHex: record.passwordSalt,
      hashHex: record.passwordHash,
    };
  }

  /**
   * Записывает новый хэш и соль пароля.
   * @param userId Идентификатор пользователя.
   * @param passwordHash Новый хэш.
   * @returns Ничего.
   */
  public async updatePassword(userId: string, passwordHash: PasswordHash): Promise<void> {
    await getPrismaClient().user.update({
      where: { id: userId },
      data: {
        passwordHash: passwordHash.hashHex,
        passwordSalt: passwordHash.saltHex,
      },
    });
  }

  /** Преобразует строку Prisma в UserAccount. */
  private map(record: {
    id: string;
    login: string;
    email: string;
    role: UserRole;
    createdAt: Date;
  }): UserAccount {
    return {
      id: record.id,
      login: record.login,
      email: record.email,
      role: record.role,
      createdAt: record.createdAt,
    };
  }
}
