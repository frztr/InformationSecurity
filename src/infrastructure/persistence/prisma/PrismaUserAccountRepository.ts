import type { NewUserAccount, UserAccountRepository } from "@/domain/identity/UserAccountRepository";
import type { PasswordHash } from "@/domain/identity/PasswordHash";
import type { UserAccount } from "@/domain/identity/UserAccount";
import type { UserRole } from "@/domain/identity/UserRole";
import { getPrismaClient } from "@/infrastructure/persistence/prisma/PrismaClientSingleton";

export class PrismaUserAccountRepository implements UserAccountRepository {
  public async findByLogin(login: string): Promise<UserAccount | null> {
    const record = await getPrismaClient().user.findUnique({ where: { login } });
    return record ? this.map(record) : null;
  }

  public async findByEmail(email: string): Promise<UserAccount | null> {
    const record = await getPrismaClient().user.findUnique({ where: { email } });
    return record ? this.map(record) : null;
  }

  public async findById(userId: string): Promise<UserAccount | null> {
    const record = await getPrismaClient().user.findUnique({ where: { id: userId } });
    return record ? this.map(record) : null;
  }

  public async listAll(): Promise<UserAccount[]> {
    const records = await getPrismaClient().user.findMany({ orderBy: { createdAt: "asc" } });
    return records.map((record) => this.map(record));
  }

  public async insert(newUser: NewUserAccount): Promise<UserAccount> {
    const record = await getPrismaClient().user.create({
      data: {
        login: newUser.login,
        email: newUser.email,
        role: newUser.role,
        passwordHash: newUser.passwordHash.hashHex,
        passwordSalt: newUser.passwordHash.saltHex,
        totpSecretBase32: newUser.totpSecretBase32,
      },
    });
    return this.map(record);
  }

  public async getPasswordHash(userId: string): Promise<PasswordHash> {
    const record = await getPrismaClient().user.findUniqueOrThrow({ where: { id: userId } });
    return {
      algorithm: "streebog512",
      saltHex: record.passwordSalt,
      hashHex: record.passwordHash,
    };
  }

  public async updatePassword(userId: string, passwordHash: PasswordHash): Promise<void> {
    await getPrismaClient().user.update({
      where: { id: userId },
      data: {
        passwordHash: passwordHash.hashHex,
        passwordSalt: passwordHash.saltHex,
      },
    });
  }

  private map(record: {
    id: string;
    login: string;
    email: string;
    role: UserRole;
    totpSecretBase32: string;
    createdAt: Date;
  }): UserAccount {
    return {
      id: record.id,
      login: record.login,
      email: record.email,
      role: record.role,
      totpSecretBase32: record.totpSecretBase32,
      createdAt: record.createdAt,
    };
  }
}
