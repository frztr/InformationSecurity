import type { EncryptionMethod } from "@/domain/cryptography/EncryptionMethod";
import type { EncryptionMethodCatalog } from "@/domain/access/EncryptionMethodCatalog";
import type { UserAccount } from "@/domain/identity/UserAccount";
import { UserRole } from "@/domain/identity/UserRole";

export class ToggleEncryptionMethodUseCase {
  public constructor(private readonly encryptionMethodCatalog: EncryptionMethodCatalog) {}

  public async execute(actor: UserAccount, method: EncryptionMethod, enabled: boolean): Promise<void> {
    if (actor.role !== UserRole.ADMIN) {
      throw new Error("Только администратор может включать и отключать методы.");
    }
    await this.encryptionMethodCatalog.setEnabled(method, enabled);
  }
}
