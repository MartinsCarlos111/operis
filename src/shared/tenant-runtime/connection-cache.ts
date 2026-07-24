import type { PrismaClient } from '@prisma/client';

/** Uma conexão ativa de tenant e seus metadados de ciclo de vida. */
export interface TenantConnection {
  tenantId: string;
  prismaClient: PrismaClient;
  createdAt: number;
  lastAccess: number;
}

/**
 * Cache de conexões indexado por tenantId (Map<tenantId, TenantConnection>).
 * Guarda só o estado — a política de TTL e o disconnect ficam no
 * ConnectionManager, que orquestra. O relógio é injetável para testes.
 */
export class ConnectionCache {
  private readonly conexoes = new Map<string, TenantConnection>();

  constructor(private readonly agora: () => number = () => Date.now()) {}

  obter(tenantId: string): TenantConnection | undefined {
    return this.conexoes.get(tenantId);
  }

  /** Registra uma nova conexão com createdAt/lastAccess = agora. */
  registrar(tenantId: string, prismaClient: PrismaClient): TenantConnection {
    const ts = this.agora();
    const conexao: TenantConnection = {
      tenantId,
      prismaClient,
      createdAt: ts,
      lastAccess: ts,
    };
    this.conexoes.set(tenantId, conexao);
    return conexao;
  }

  /** Marca acesso (renova a janela de inatividade). */
  tocar(tenantId: string): void {
    const conexao = this.conexoes.get(tenantId);
    if (conexao) conexao.lastAccess = this.agora();
  }

  remover(tenantId: string): TenantConnection | undefined {
    const conexao = this.conexoes.get(tenantId);
    this.conexoes.delete(tenantId);
    return conexao;
  }

  /** Conexões cujo lastAccess é mais velho que `ttlMs` a partir de agora. */
  expiradas(ttlMs: number): TenantConnection[] {
    const limite = this.agora() - ttlMs;
    return [...this.conexoes.values()].filter((c) => c.lastAccess < limite);
  }

  todas(): TenantConnection[] {
    return [...this.conexoes.values()];
  }

  get tamanho(): number {
    return this.conexoes.size;
  }
}
