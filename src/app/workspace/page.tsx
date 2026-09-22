import { WorkspaceClient } from "@/components/workspace/WorkspaceClient";
import { toHistoryMessage } from "@/domain/messaging/EncryptedMessageRecord";
import { getReadyServices } from "@/infrastructure/composition/ApplicationComposer";
import { authorizePage } from "@/infrastructure/http/AuthenticationMiddleware";

export const dynamic = "force-dynamic";

/**
 * Рабочий стол авторизованного пользователя: шифрование и свой журнал сообщений.
 */
export default async function WorkspacePage() {
  const actor = await authorizePage();
  const { administration, messages, system } = await getReadyServices();
  const [methods, messageList, status] = await Promise.all([
    administration.getAllEncryptionMethods(),
    messages.getEncryptedMessages(actor),
    system.getSystemStatus(),
  ]);

  return (
    <WorkspaceClient
      actorLogin={actor.login}
      methods={methods}
      messages={messageList.map(toHistoryMessage)}
      rsaReady={status.rsa.status === "READY"}
    />
  );
}
