import type { PasswordHash } from "@/domain/identity/PasswordHash";
import type { UserAccount } from "@/domain/identity/UserAccount";
import type { UserRole } from "@/domain/identity/UserRole";

/**
 * Данные для создания учётной записи.
 */
export type NewUserAccount = {
  login: string;
  email: string;
  role: UserRole;
  passwordHash: PasswordHash;
  totpSecretBase32: string;
};

/**
 * Хранилище учётных записей.
 */
export interface IUserAccountRepository {
  /**
   * Ищет учётную запись по логину.
   * @param login Логин.
   * @returns Учётная запись или `null`.
   */
  findByLogin(login: string): Promise<UserAccount | null>;
  /**
   * Ищет учётную запись по адресу почты.
   * @param email Адрес электронной почты.
   * @returns Учётная запись или `null`.
   */
  findByEmail(email: string): Promise<UserAccount | null>;
  /**
   * Ищет учётную запись по идентификатору.
   * @param userId Идентификатор пользователя.
   * @returns Учётная запись или `null`.
   */
  findById(userId: string): Promise<UserAccount | null>;
  /**
   * Возвращает все учётные записи.
   */
  listAll(): Promise<UserAccount[]>;
  /**
   * Создаёт учётную запись.
   * @param newUser Данные новой записи.
   */
  insert(newUser: NewUserAccount): Promise<UserAccount>;
  /**
   * Возвращает хранимый хэш пароля.
   * @param userId Идентификатор пользователя.
   */
  getPasswordHash(userId: string): Promise<PasswordHash>;
  /**
   * Заменяет хэш пароля.
   * @param userId Идентификатор пользователя.
   * @param passwordHash Новый хэш.
   */
  updatePassword(userId: string, passwordHash: PasswordHash): Promise<void>;
}
