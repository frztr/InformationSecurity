/**
 * Точка входа Next.js Instrumentation: поднимает сервисы в Node-runtime.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initializeApplication } = await import("@/infrastructure/composition/ApplicationComposer");
    await initializeApplication();
  }
}
