import { redirect } from "next/navigation";
import { AdminClient } from "@/components/admin/AdminClient";
import { UserRole } from "@/domain/identity/UserRole";
import { initializeApplication, getApplicationComposer, resolveSessionUser } from "@/infrastructure/composition/ApplicationComposer";
import { readSessionToken } from "@/infrastructure/http/AuthCookies";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await initializeApplication();
  const actor = await resolveSessionUser(await readSessionToken());
  if (!actor || actor.role !== UserRole.ADMIN) {
    redirect("/workspace");
  }

  const composer = getApplicationComposer();
  const methods = await composer.encryptionMethodCatalog.list();
  const users = await composer.userAccountRepository.listAll();
  const messages = await composer.listMessagesUseCase.execute(actor);

  return (
    <AdminClient
      methods={methods}
      users={users.map((user) => ({
        id: user.id,
        login: user.login,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
      }))}
      messages={messages.map((message) => ({
        id: message.id,
        userLogin: message.userLogin,
        method: message.method,
        plaintext: message.plaintext,
        ciphertextHex: message.ciphertextHex,
        keyMaterial: message.keyMaterial,
        createdAt: message.createdAt.toISOString(),
      }))}
    />
  );
}
