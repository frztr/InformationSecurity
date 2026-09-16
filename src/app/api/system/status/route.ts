import { NextResponse } from "next/server";
import { initializeApplication, getApplicationComposer, resolveSessionUser } from "@/infrastructure/composition/ApplicationComposer";
import { readSessionToken } from "@/infrastructure/http/AuthCookies";

export async function GET(): Promise<Response> {
  await initializeApplication();
  const composer = getApplicationComposer();
  const rsa = await composer.systemRsaKeyStore.getStatus();
  const methods = await composer.encryptionMethodCatalog.list();
  const user = await resolveSessionUser(await readSessionToken());
  const modulusBitLength = Number(process.env.RSA_MODULUS_BIT_LENGTH ?? composer.settings.rsa.modulusBitLength);
  const expectedPrimeBitLength = modulusBitLength / 2;
  const collectedPrimeCount = await composer.collectedPrimeNumberRepository.countByBitLength(expectedPrimeBitLength);

  return NextResponse.json({
    rsa,
    kafka: {
      brokers: composer.settings.kafka.brokers,
      topic: composer.settings.kafka.topic,
      expectedPrimeBitLength,
      collectedPrimeCount,
    },
    methods,
    mail: {
      domain: composer.settings.mail.domain,
      webmailUrl: composer.settings.mail.webmailUrl,
      signupUrl: composer.settings.mail.signupUrl,
    },
    actor: user
      ? { id: user.id, login: user.login, email: user.email, role: user.role }
      : { role: "GUEST" },
  });
}
