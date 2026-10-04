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
  const { administrationService, messageService, systemService } = await getReadyServices();
  const [methods, messageList, status] = await Promise.all([
    administrationService.getAllEncryptionMethods(),
    messageService.getEncryptedMessages(actor),
    systemService.getSystemStatus(),
  ]);

  return (
    <WorkspaceClient
      actorLogin={actor.login}
      methods={methods}
      messages={messageList.map(toHistoryMessage)}
      rsaReady={status.kafka.collectedPrimeCount >= 2}
    />
  );
}
