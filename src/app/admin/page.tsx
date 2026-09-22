import { AdminClient } from "@/components/admin/AdminClient";
import { UserRole } from "@/domain/identity/UserRole";
import { toHistoryMessage } from "@/domain/messaging/EncryptedMessageRecord";
import { getReadyServices } from "@/infrastructure/composition/ApplicationComposer";
import { authorizePage } from "@/infrastructure/http/AuthenticationMiddleware";

export const dynamic = "force-dynamic";

/**
 * Страница администрирования. Доступна только роли ADMIN.
 */
export default async function AdminPage() {
  const actor = await authorizePage(UserRole.ADMIN);
  const { administration, messages } = await getReadyServices();
  const [methods, usersResult, messageList] = await Promise.all([
    administration.getAllEncryptionMethods(),
    administration.getAllUsers(actor),
    messages.getEncryptedMessages(actor),
  ]);
  if (usersResult.isError) {
    throw new Error(usersResult.error);
  }
  const users = usersResult.resultDto;

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
      messages={messageList.map(toHistoryMessage)}
    />
  );
}
