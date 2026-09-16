import type { RegisterUserUseCase } from "@/application/identity/RegisterUserUseCase";
import type { UserAccount } from "@/domain/identity/UserAccount";
import type { UserRole } from "@/domain/identity/UserRole";
import { UserRole as UserRoleValue } from "@/domain/identity/UserRole";

export class CreateUserByAdminUseCase {
  public constructor(private readonly registerUserUseCase: RegisterUserUseCase) {}

  public async execute(
    actor: UserAccount,
    values: {
      login: string;
      email: string;
      password: string;
      passwordConfirmation: string;
      role: UserRole;
    },
  ) {
    if (actor.role !== UserRoleValue.ADMIN) {
      throw new Error("Только администратор может создавать пользователей.");
    }
    return this.registerUserUseCase.execute(values, values.role);
  }
}
