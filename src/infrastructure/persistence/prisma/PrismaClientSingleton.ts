import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  prismaClient?: PrismaClient;
};

export function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prismaClient) {
    globalForPrisma.prismaClient = new PrismaClient();
  }
  return globalForPrisma.prismaClient;
}
