import { redirect } from "next/navigation";
import { WorkspaceClient } from "@/components/workspace/WorkspaceClient";
import { initializeApplication, getApplicationComposer, resolveSessionUser } from "@/infrastructure/composition/ApplicationComposer";
import { readSessionToken } from "@/infrastructure/http/AuthCookies";

export const dynamic = "force-dynamic";

export default async function WorkspacePage() {
  await initializeApplication();
  const actor = await resolveSessionUser(await readSessionToken());
  if (!actor) {
    redirect("/login");
  }

  const composer = getApplicationComposer();
  const methods = await composer.encryptionMethodCatalog.list();
  const messages = await composer.listMessagesUseCase.execute(actor);
  const rsa = await composer.systemRsaKeyStore.getStatus();

  return (
    <WorkspaceClient
      actorLogin={actor.login}
      methods={methods}
      messages={messages.map((message) => ({
        id: message.id,
        userLogin: message.userLogin,
        method: message.method,
        plaintext: message.plaintext,
        ciphertextHex: message.ciphertextHex,
        keyMaterial: message.keyMaterial,
        createdAt: message.createdAt.toISOString(),
      }))}
      rsaReady={rsa.status === "READY"}
    />
  );
}
