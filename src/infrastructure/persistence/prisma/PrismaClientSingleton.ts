import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  prismaClient?: PrismaClient;
};

/**
 * Возвращает процессный синглтон PrismaClient (хранится на globalThis).
 * @returns Клиент Prisma.
 */
export function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prismaClient) {
    globalForPrisma.prismaClient = new PrismaClient();
  }
  return globalForPrisma.prismaClient;
}
