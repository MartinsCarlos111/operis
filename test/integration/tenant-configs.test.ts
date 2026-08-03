import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import type { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { buildApp } from '../../src/server.js';
import type { ConnectionManager } from '../../src/shared/tenant-runtime/index.js';
import { ScryptHasherSenha } from '../../src/modules/operis_control/infrastructure/gateways/scrypt-hasher-senha.js';
import { AesGcmEncryptionService } from '../../src/modules/operis_control/infrastructure/gateways/aes-gcm-encryption.service.js';

/**
 * Integração das configs de infra por-tenant no Control Plane (migração §6.13):
 * RabbitMQ e SMTP, geridos pelo super-admin em /admin, seguindo o padrão do
 * TenantDatabase — senha cifrada (AES-256-GCM), nunca exposta na resposta.
 */
describe('Configs de tenant (RabbitMQ + SMTP) /admin (integração)', () => {
  let container: StartedPostgreSqlContainer;
  let prisma: PrismaClient;
  let app: FastifyInstance;
  let connectionManager: ConnectionManager;
  const chaveMestra = Buffer.alloc(32, 9).toString('base64');

  let tokenSuperAdmin: string;
  let tenantId: string;

  const auth = () => ({ authorization: `Bearer ${tokenSuperAdmin}` });

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
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
      chaveMestraCriptografia: chaveMestra,
      logger: false,
    }));
    await app.ready();

    const hasher = new ScryptHasherSenha();
    await prisma.superAdmin.create({
      data: {
        nome: 'Suporte',
        email: 'suporte@operis.local',
        senhaHash: await hasher.gerarHash('senha-suporte-123'),
      },
    });

    // Tenant criado direto (sem provisionar banco dedicado — não é o foco aqui).
    const tenant = await prisma.tenant.create({ data: { nome: 'ACME', slug: 'acme' } });
    tenantId = tenant.idTenant;

    const login = await app.inject({
      method: 'POST',
      url: '/admin/auth/login',
      payload: { email: 'suporte@operis.local', senha: 'senha-suporte-123' },
    });
    tokenSuperAdmin = login.json().token;
  });

  afterAll(async () => {
    await app?.close();
    await connectionManager?.encerrar();
    await prisma?.$disconnect();
    await container?.stop();
  });

  // ─── Segurança ─────────────────────────────────────────────────────────────
  it('nega configurar RabbitMQ sem token de super-admin (401)', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/admin/tenants/${tenantId}/rabbitmq`,
      payload: { host: 'localhost', porta: 5672, usuario: 'guest', senha: 'x' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('token de tenant_admin NÃO configura infra do tenant (403)', async () => {
    const intruso = app.jwt.sign({ sub: 'x', tipo: 'tenant_admin', tenantId });
    const res = await app.inject({
      method: 'PUT',
      url: `/admin/tenants/${tenantId}/smtp`,
      headers: { authorization: `Bearer ${intruso}` },
      payload: { host: 'smtp.x', porta: 587, usuario: 'u', senha: 'x' },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe('ACESSO_RESTRITO');
  });

  // ─── RabbitMQ ──────────────────────────────────────────────────────────────
  it('cadastra RabbitMQ cifrando a senha (nunca a devolve) e faz upsert', async () => {
    const senha = 'rabbit-secreta-123';
    const res = await app.inject({
      method: 'PUT',
      url: `/admin/tenants/${tenantId}/rabbitmq`,
      headers: auth(),
      payload: {
        host: 'broker.acme.local',
        porta: 5672,
        usuario: 'acme',
        senha,
        virtualHost: '/acme',
        sslHabilitado: true,
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      tenantId,
      host: 'broker.acme.local',
      porta: 5672,
      virtualHost: '/acme',
      usuario: 'acme',
      sslHabilitado: true,
      senhaConfigurada: true,
    });
    // a senha NUNCA aparece na resposta
    expect(JSON.stringify(res.json())).not.toContain(senha);

    // no banco a senha está cifrada (não em texto puro) e é decifrável
    const row = await prisma.tenantRabbitMq.findUniqueOrThrow({ where: { tenantId } });
    expect(row.senhaEncrypted).not.toContain(senha);
    const encryption = new AesGcmEncryptionService(chaveMestra);
    expect(
      encryption.decifrar({ valor: row.senhaEncrypted, versao: row.encryptionVersion }),
    ).toBe(senha);

    // upsert: segunda chamada atualiza a MESMA linha (não duplica)
    const res2 = await app.inject({
      method: 'PUT',
      url: `/admin/tenants/${tenantId}/rabbitmq`,
      headers: auth(),
      payload: { host: 'novo.broker', porta: 5673, usuario: 'acme2', senha: 'outra' },
    });
    expect(res2.statusCode).toBe(200);
    expect(res2.json().host).toBe('novo.broker');
    expect(await prisma.tenantRabbitMq.count({ where: { tenantId } })).toBe(1);
  });

  it('obtém RabbitMQ sem a senha (200)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/admin/tenants/${tenantId}/rabbitmq`,
      headers: auth(),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ host: 'novo.broker', senhaConfigurada: true });
    expect(res.json().senha).toBeUndefined();
    expect(res.json().senhaEncrypted).toBeUndefined();
  });

  // ─── SMTP ──────────────────────────────────────────────────────────────────
  it('cadastra SMTP cifrando a senha e a devolve mascarada', async () => {
    const senha = 'smtp-secreta-456';
    const res = await app.inject({
      method: 'PUT',
      url: `/admin/tenants/${tenantId}/smtp`,
      headers: auth(),
      payload: {
        host: 'smtp.acme.local',
        porta: 587,
        usuario: 'no-reply@acme.com',
        senha,
        remetente: 'ACME <no-reply@acme.com>',
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      host: 'smtp.acme.local',
      porta: 587,
      remetente: 'ACME <no-reply@acme.com>',
      sslHabilitado: true,
      senhaConfigurada: true,
    });
    expect(JSON.stringify(res.json())).not.toContain(senha);

    const row = await prisma.tenantSmtp.findUniqueOrThrow({ where: { tenantId } });
    const encryption = new AesGcmEncryptionService(chaveMestra);
    expect(
      encryption.decifrar({ valor: row.senhaEncrypted, versao: row.encryptionVersion }),
    ).toBe(senha);
  });

  it('obtém SMTP sem a senha (200)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/admin/tenants/${tenantId}/smtp`,
      headers: auth(),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ host: 'smtp.acme.local', senhaConfigurada: true });
  });

  // ─── Regras ────────────────────────────────────────────────────────────────
  it('404 ao configurar infra de tenant inexistente', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/admin/tenants/00000000-0000-0000-0000-0000000000ff/rabbitmq',
      headers: auth(),
      payload: { host: 'x', porta: 5672, usuario: 'u', senha: 'p' },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('TENANT_NAO_ENCONTRADO');
  });

  it('404 ao obter SMTP de um tenant que ainda não configurou', async () => {
    const outro = await prisma.tenant.create({ data: { nome: 'Beta', slug: 'beta' } });
    const res = await app.inject({
      method: 'GET',
      url: `/admin/tenants/${outro.idTenant}/smtp`,
      headers: auth(),
    });
    expect(res.statusCode).toBe(404);
  });
});
