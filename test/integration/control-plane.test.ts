import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import type { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { buildApp } from '../../src/server.js';
import { ScryptHasherSenha } from '../../src/modules/operis_control/infrastructure/gateways/scrypt-hasher-senha.js';

/**
 * Integração do Control Plane contra Postgres REAL: login isolado do
 * super-admin, criação de tenant com validação de conexão + criptografia da
 * senha + provisionamento do schema num SEGUNDO banco do mesmo container, e
 * login do administrador do tenant.
 */
describe('Control Plane /admin (integração)', () => {
  let container: StartedPostgreSqlContainer;
  let prisma: PrismaClient;
  let app: FastifyInstance;
  let connectionManager: import('../../src/shared/tenant-runtime/index.js').ConnectionManager;
  let tokenSuperAdmin: string;

  const bancoTenant = () => ({
    host: container.getHost(),
    porta: container.getMappedPort(5432),
    nomeBanco: 'operis_tenant_acme',
    usuario: container.getUsername(),
    senha: container.getPassword(),
    sslHabilitado: false,
  });

  beforeAll(async () => {
    // Senha distinta do username: a asserção "senha nunca aparece na resposta"
    // só é significativa se senha e usuário não forem a mesma string.
    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withPassword('senha-container-secreta-987')
      .start();
    const url = container.getConnectionUri();

    execFileSync('npx', ['prisma', 'db', 'push', '--skip-generate'], {
      env: { ...process.env, DATABASE_URL: url },
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    prisma = new PrismaClient({ datasources: { db: { url } } });
    ({ app, connectionManager } = buildApp({
      prisma,
      jwtSecret: 'segredo-de-teste',
      chaveMestraCriptografia: Buffer.alloc(32, 9).toString('base64'),
      logger: false,
    }));
    await app.ready();

    // Bootstrap: primeiro super-admin (papel do seed em produção).
    const hasher = new ScryptHasherSenha();
    await prisma.superAdmin.create({
      data: {
        nome: 'Suporte',
        email: 'suporte@operis.local',
        senhaHash: await hasher.gerarHash('senha-suporte-123'),
      },
    });

    // Segundo banco no mesmo container — será o banco dedicado do tenant.
    await prisma.$executeRawUnsafe('CREATE DATABASE operis_tenant_acme');
  });

  afterAll(async () => {
    await app?.close();
    await connectionManager?.encerrar();
    await prisma?.$disconnect();
    await container?.stop();
  });

  it('super-admin faz login isolado em /admin/auth/login', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/admin/auth/login',
      payload: { email: 'suporte@operis.local', senha: 'senha-suporte-123' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.token).toBeTypeOf('string');
    expect(body.superAdmin).toMatchObject({ email: 'suporte@operis.local' });
    expect(JSON.stringify(body)).not.toContain('senhaHash');
    tokenSuperAdmin = body.token;
  });

  it('senha errada → 401 com mensagem indistinguível', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/admin/auth/login',
      payload: { email: 'suporte@operis.local', senha: 'errada' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('CREDENCIAIS_INVALIDAS');
  });

  it('rotas /admin exigem token de super-admin (401 sem token)', async () => {
    const res = await app.inject({ method: 'GET', url: '/admin/tenants' });
    expect(res.statusCode).toBe(401);
  });

  it('token de tenant_admin NÃO entra no painel /admin (403)', async () => {
    const tokenIntruso = app.jwt.sign({ sub: 'qualquer', tipo: 'tenant_admin', tenantId: 'x' });
    const res = await app.inject({
      method: 'GET',
      url: '/admin/tenants',
      headers: { authorization: `Bearer ${tokenIntruso}` },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe('ACESSO_RESTRITO');
  });

  it('cria tenant: valida conexão, cifra senha, provisiona schema no banco dedicado, cria admin', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/admin/tenants',
      headers: { authorization: `Bearer ${tokenSuperAdmin}` },
      payload: {
        nome: 'ACME Ltda',
        slug: 'acme',
        banco: bancoTenant(),
        administrador: { nome: 'Alice', email: 'alice@acme.com', senha: 'senha-alice-123' },
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.tenant).toMatchObject({
      nome: 'ACME Ltda',
      slug: 'acme',
      banco: { nomeBanco: 'operis_tenant_acme', statusConexao: 'ONLINE' },
    });
    // Credenciais NUNCA aparecem na resposta — nem cifradas.
    expect(JSON.stringify(body)).not.toContain(container.getPassword());
    expect(JSON.stringify(body)).not.toContain('PasswordEncrypted');

    // No banco do Control Plane, a senha está cifrada (não em texto puro).
    const row = await prisma.tenantDatabase.findFirstOrThrow();
    expect(row.databasePasswordEncrypted).not.toContain(container.getPassword());
    expect(row.databasePasswordEncrypted.startsWith('v1$')).toBe(true);

    // O schema foi de fato aplicado no banco dedicado do tenant.
    const prismaTenant = new PrismaClient({
      datasources: {
        db: {
          url: `postgresql://${container.getUsername()}:${container.getPassword()}@${container.getHost()}:${container.getMappedPort(5432)}/operis_tenant_acme`,
        },
      },
    });
    try {
      const tabelas = await prismaTenant.$queryRaw<{ table_name: string }[]>`
        SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
      `;
      const nomes = tabelas.map((t) => t.table_name);
      expect(nomes).toContain('estabelecimentos');
      expect(nomes).toContain('usuarios');
    } finally {
      await prismaTenant.$disconnect();
    }
  });

  it('não cria tenant com credenciais de banco erradas (422, nada persiste)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/admin/tenants',
      headers: { authorization: `Bearer ${tokenSuperAdmin}` },
      payload: {
        nome: 'Fantasma',
        slug: 'fantasma',
        banco: { ...bancoTenant(), senha: 'senha-errada' },
        administrador: { nome: 'Bob', email: 'bob@fantasma.com', senha: 'senha-bob-1234' },
      },
    });

    expect(res.statusCode).toBe(422);
    expect(res.json().error.code).toBe('CONEXAO_BANCO_FALHOU');
    expect(await prisma.tenant.findUnique({ where: { slug: 'fantasma' } })).toBeNull();
  });

  it('lista tenants no painel', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/admin/tenants',
      headers: { authorization: `Bearer ${tokenSuperAdmin}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(1);
  });

  it('testa a conexão de um tenant sob demanda e registra o resultado', async () => {
    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: 'acme' } });
    const res = await app.inject({
      method: 'POST',
      url: `/admin/tenants/${tenant.idTenant}/testar-conexao`,
      headers: { authorization: `Bearer ${tokenSuperAdmin}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().banco.statusConexao).toBe('ONLINE');
    expect(res.json().banco.ultimaConexaoEm).not.toBeNull();
  });

  it('administrador do tenant loga em /auth/login e recebe JWT com tenantId', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'alice@acme.com', senha: 'senha-alice-123' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: 'acme' } });
    expect(body.administrador).toMatchObject({ email: 'alice@acme.com', tenantId: tenant.idTenant });

    const payload = app.jwt.verify<{ tipo: string; tenantId: string }>(body.token);
    expect(payload.tipo).toBe('tenant_admin');
    expect(payload.tenantId).toBe(tenant.idTenant);
  });
});
