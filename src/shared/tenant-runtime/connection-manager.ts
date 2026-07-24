import type { PrismaClient } from '@prisma/client';
import { ConnectionCache } from './connection-cache.js';
import type { PrismaFactory } from './prisma-factory.js';
import { TenantNaoResolvidoError, type TenantResolver } from './tenant-resolver.js';

export interface ConnectionManagerOptions {
  /** Tempo máximo de inatividade antes do disconnect. Default: 30 min. */
  ttlMs?: number;
  /** Intervalo do varredor de conexões expiradas. Default: 5 min. */
  sweepIntervalMs?: number;
  /** Relógio injetável (testes). */
  agora?: () => number;
}

const TTL_PADRAO = 30 * 60 * 1000;
const SWEEP_PADRAO = 5 * 60 * 1000;

/**
 * Connection Manager — único componente autorizado a criar/gerenciar
 * PrismaClients de tenants. Garante um pool por tenant reutilizando o cache,
 * cria sob demanda (cache miss) via resolver + factory, serializa criações
 * concorrentes com um lock por tenant e encerra conexões inativas por TTL.
 *
 *   getConnection(tenantId)
 *     → cache hit  → tocar(lastAccess) → retorna
 *     → cache miss → (lock) resolver → factory → cache → retorna
 */
export class ConnectionManager {
  private readonly cache: ConnectionCache;
  private readonly ttlMs: number;
  private readonly sweepIntervalMs: number;
  private readonly agora: () => number;

  /** Criações em andamento por tenant — evita dois pools para o mesmo tenant. */
  private readonly emCriacao = new Map<string, Promise<PrismaClient>>();

  private sweeper: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly resolver: TenantResolver,
    private readonly factory: PrismaFactory,
    options: ConnectionManagerOptions = {},
  ) {
    this.agora = options.agora ?? (() => Date.now());
    this.ttlMs = options.ttlMs ?? TTL_PADRAO;
    this.sweepIntervalMs = options.sweepIntervalMs ?? SWEEP_PADRAO;
    this.cache = new ConnectionCache(this.agora);
  }

  /**
   * Resolve (ou reutiliza) o PrismaClient do tenant. Lança
   * TenantNaoResolvidoError se o Control Plane não conhecer o tenant.
   */
  async getConnection(tenantId: string): Promise<PrismaClient> {
    const existente = this.cache.obter(tenantId);
    if (existente) {
      this.cache.tocar(tenantId);
      return existente.prismaClient;
    }

    // Cache miss: se já há uma criação em voo para este tenant, espera a mesma.
    const emVoo = this.emCriacao.get(tenantId);
    if (emVoo) return emVoo;

    const criacao = this.criar(tenantId);
    this.emCriacao.set(tenantId, criacao);
    try {
      return await criacao;
    } finally {
      this.emCriacao.delete(tenantId);
    }
  }

  private async criar(tenantId: string): Promise<PrismaClient> {
    const dados = await this.resolver.resolver(tenantId);
    if (!dados) {
      throw new TenantNaoResolvidoError(tenantId);
    }
    const prismaClient = this.factory.criar(dados);
    this.cache.registrar(tenantId, prismaClient);
    return prismaClient;
  }

  /** Encerra e remove a conexão de um tenant (ex.: troca de banco). */
  async invalidar(tenantId: string): Promise<void> {
    const conexao = this.cache.remover(tenantId);
    if (conexao) await conexao.prismaClient.$disconnect();
  }

  /** Desconecta conexões inativas há mais que o TTL. Idempotente. */
  async removerExpiradas(): Promise<void> {
    const expiradas = this.cache.expiradas(this.ttlMs);
    await Promise.all(
      expiradas.map(async (c) => {
        this.cache.remover(c.tenantId);
        await c.prismaClient.$disconnect();
      }),
    );
  }

  /** Inicia o varredor periódico de TTL. unref() para não segurar o processo. */
  iniciarSweeper(): void {
    if (this.sweeper) return;
    this.sweeper = setInterval(() => {
      void this.removerExpiradas();
    }, this.sweepIntervalMs);
    this.sweeper.unref?.();
  }

  /** Para o varredor e encerra TODAS as conexões (shutdown gracioso). */
  async encerrar(): Promise<void> {
    if (this.sweeper) {
      clearInterval(this.sweeper);
      this.sweeper = null;
    }
    await Promise.all(
      this.cache.todas().map(async (c) => {
        this.cache.remover(c.tenantId);
        await c.prismaClient.$disconnect();
      }),
    );
  }

  get tamanhoCache(): number {
    return this.cache.tamanho;
  }
}
