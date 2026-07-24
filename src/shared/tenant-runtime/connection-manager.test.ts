import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { ConnectionManager } from './connection-manager.js';
import type { PrismaFactory } from './prisma-factory.js';
import {
  TenantNaoResolvidoError,
  type DadosConexaoTenant,
  type TenantResolver,
} from './tenant-resolver.js';

/**
 * Testa o Connection Manager sem Postgres: fakes de resolver e factory bastam.
 * O PrismaClient é um duble com $disconnect espionável — nunca abre conexão.
 */

const dados: DadosConexaoTenant = {
  host: 'localhost',
  porta: 5432,
  nomeBanco: 'tenant_a',
  usuario: 'app',
  senha: 'secreta',
  sslHabilitado: false,
};

function fakeClient(): PrismaClient {
  return { $disconnect: vi.fn().mockResolvedValue(undefined) } as unknown as PrismaClient;
}

class ResolverFake implements TenantResolver {
  public chamadas = 0;
  constructor(private readonly config: DadosConexaoTenant | null = dados) {}
  async resolver(): Promise<DadosConexaoTenant | null> {
    this.chamadas += 1;
    return this.config;
  }
}

class FactoryFake implements PrismaFactory {
  public criados: PrismaClient[] = [];
  criar(): PrismaClient {
    const client = fakeClient();
    this.criados.push(client);
    return client;
  }
}

describe('ConnectionManager', () => {
  let resolver: ResolverFake;
  let factory: FactoryFake;

  beforeEach(() => {
    resolver = new ResolverFake();
    factory = new FactoryFake();
  });

  it('cache miss: resolve, cria e armazena a conexão', async () => {
    const manager = new ConnectionManager(resolver, factory);
    const client = await manager.getConnection('tenant-a');

    expect(client).toBe(factory.criados[0]);
    expect(resolver.chamadas).toBe(1);
    expect(manager.tamanhoCache).toBe(1);
  });

  it('cache hit: reutiliza a mesma instância sem recriar', async () => {
    const manager = new ConnectionManager(resolver, factory);
    const primeira = await manager.getConnection('tenant-a');
    const segunda = await manager.getConnection('tenant-a');

    expect(segunda).toBe(primeira);
    expect(factory.criados).toHaveLength(1);
    expect(resolver.chamadas).toBe(1); // resolveu só na primeira
  });

  it('tenants diferentes recebem pools diferentes', async () => {
    const manager = new ConnectionManager(resolver, factory);
    const a = await manager.getConnection('tenant-a');
    const b = await manager.getConnection('tenant-b');

    expect(a).not.toBe(b);
    expect(manager.tamanhoCache).toBe(2);
  });

  it('concorrência: dois getConnection simultâneos criam UM pool só', async () => {
    // Resolver lento para garantir sobreposição das duas chamadas.
    const lento: TenantResolver = {
      resolver: () =>
        new Promise((resolve) => setTimeout(() => resolve(dados), 20)),
    };
    const manager = new ConnectionManager(lento, factory);

    const [a, b] = await Promise.all([
      manager.getConnection('tenant-a'),
      manager.getConnection('tenant-a'),
    ]);

    expect(a).toBe(b);
    expect(factory.criados).toHaveLength(1);
    expect(manager.tamanhoCache).toBe(1);
  });

  it('tenant não resolvido: lança TenantNaoResolvidoError e não cacheia', async () => {
    const manager = new ConnectionManager(new ResolverFake(null), factory);

    await expect(manager.getConnection('fantasma')).rejects.toBeInstanceOf(
      TenantNaoResolvidoError,
    );
    expect(manager.tamanhoCache).toBe(0);
  });

  it('TTL: removerExpiradas desconecta e remove conexões inativas', async () => {
    let agora = 1_000;
    const manager = new ConnectionManager(resolver, factory, {
      ttlMs: 100,
      agora: () => agora,
    });

    const client = await manager.getConnection('tenant-a');
    agora += 101; // passou do TTL sem novos acessos

    await manager.removerExpiradas();

    expect(client.$disconnect).toHaveBeenCalledOnce();
    expect(manager.tamanhoCache).toBe(0);
  });

  it('TTL: acesso recente renova a janela (não expira)', async () => {
    let agora = 1_000;
    const manager = new ConnectionManager(resolver, factory, {
      ttlMs: 100,
      agora: () => agora,
    });

    await manager.getConnection('tenant-a');
    agora += 80;
    await manager.getConnection('tenant-a'); // tocou lastAccess
    agora += 80; // 160 desde a criação, mas só 80 desde o último acesso

    await manager.removerExpiradas();

    expect(manager.tamanhoCache).toBe(1);
  });

  it('invalidar: desconecta e remove; próxima chamada recria', async () => {
    const manager = new ConnectionManager(resolver, factory);
    const primeira = await manager.getConnection('tenant-a');

    await manager.invalidar('tenant-a');
    expect(primeira.$disconnect).toHaveBeenCalledOnce();
    expect(manager.tamanhoCache).toBe(0);

    const segunda = await manager.getConnection('tenant-a');
    expect(segunda).not.toBe(primeira);
    expect(factory.criados).toHaveLength(2);
  });

  it('encerrar: desconecta todas as conexões', async () => {
    const manager = new ConnectionManager(resolver, factory);
    const a = await manager.getConnection('tenant-a');
    const b = await manager.getConnection('tenant-b');

    await manager.encerrar();

    expect(a.$disconnect).toHaveBeenCalledOnce();
    expect(b.$disconnect).toHaveBeenCalledOnce();
    expect(manager.tamanhoCache).toBe(0);
  });
});
