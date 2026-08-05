type ArtigoDelegate = {
  findMany(args: unknown): Promise<unknown[]>;
  findFirst(args: unknown): Promise<Record<string, unknown> | null>;
  count(args: unknown): Promise<number>;
  create(args: { data: unknown }): Promise<unknown>;
  update(args: { where: unknown; data: unknown }): Promise<unknown>;
  delete(args: { where: unknown }): Promise<unknown>;
};

export {};

declare module '@prisma/client' {
  interface PrismaClient {
    artigo: ArtigoDelegate;
    artigoCentroTrabalho: ArtigoDelegate;
  }
}
