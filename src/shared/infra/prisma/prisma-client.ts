import { PrismaClient } from '@prisma/client';

/**
 * A single PrismaClient instance for the process. Features receive it via the
 * composition root (main.ts) rather than importing it directly — that keeps the
 * dependency direction pointing inward and makes swapping the client in tests easy.
 */
export function createPrismaClient(databaseUrl?: string): PrismaClient {
  return new PrismaClient(
    databaseUrl
      ? { datasources: { db: { url: databaseUrl } } }
      : undefined,
  );
}

export type { PrismaClient };
