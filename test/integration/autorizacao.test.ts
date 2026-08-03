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
import { AesGcmEncryptionService } from '../../src/modules/operis_control/infrastructure/gateways/aes-gcm-encryption.service.js';

/**
 * Teste de integração da cadeia de autorização RBAC contra Postgres REAL
 * (Testcontainers): JWT → header x-estabelecimento-id → vínculo → nível →
 * permissões → rota liberada ou negada.
 */
describe('Autorização RBAC (integração)', () => {
  let container: StartedPostgreSqlContainer;
  let prisma: PrismaClient;
  let app: FastifyInstance;
  let connectionManager: ConnectionManager;
  const chaveMestra = Buffer.alloc(32, 7).toString('base64');

  // Ids do cenário (bootstrap direto no banco — o mesmo papel do seed).
  let estabId: string;
  let outroEstabId: string;
  let adminId: string;
  let operadorId: string;
  let nivelAdminId: string;
  let tenantId: string;
  let tokenAdmin: string;
  let tokenOperador: string;

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

    // Nesta arquitetura o banco de negócio é o banco DEDICADO do tenant. No
    // teste, o "banco do tenant" é o próprio container — registramos um Tenant
    // + TenantDatabase apontando para a mesma URL, com a senha cifrada pela
    // mesma chave mestra do app. O ConnectionManager então resolve esse banco.
    const encryption = new AesGcmEncryptionService(chaveMestra);
    const senhaCifrada = encryption.cifrar(container.getPassword());
    const tenant = await prisma.tenant.create({
      data: {
        nome: 'Tenant Teste',
        slug: 'tenant-teste',
        database: {
          create: {
            databaseHost: container.getHost(),
            databasePort: container.getMappedPort(5432),
            databaseName: container.getDatabase(),
            databaseUsername: container.getUsername(),
            databasePasswordEncrypted: senhaCifrada.valor,
            databaseEncryptionVersion: senhaCifrada.versao,
            sslEnabled: false,
            connectionStatus: 'ONLINE',
          },
        },
      },
    });
    tenantId = tenant.idTenant;

    // --- Cenário bootstrap (papel do seed em produção) ---
    const estab = await prisma.estabelecimento.create({
      data: { descricao: 'Matriz', manufatura: 'ATIVO' },
    });
    estabId = estab.idEstabelecimento;
    const outro = await prisma.estabelecimento.create({ data: { descricao: 'Filial' } });
    outroEstabId = outro.idEstabelecimento;

    const permissoes = await Promise.all(
      ['configuracoes:niveis_acesso', 'configuracoes:usuarios', 'manufatura:list'].map((chave) =>
        prisma.permissao.create({
          data: { chave, grupo: chave.split(':')[0]!, descricao: chave },
        }),
      ),
    );

    const nivelAdmin = await prisma.nivelAcesso.create({
      data: {
        nome: 'Administrador',
        estabelecimentoId: estabId,
        permissoes: {
          create: permissoes.map((p) => ({ permissaoId: p.idPermissao })),
        },
      },
    });
    nivelAdminId = nivelAdmin.idNivelAcesso;

    // Operacional só enxerga manufatura — o exemplo do domínio do usuário.
    const nivelOperacional = await prisma.nivelAcesso.create({
      data: {
        nome: 'Operacional',
        estabelecimentoId: estabId,
        permissoes: {
          create: [{ permissaoId: permissoes[2]!.idPermissao }],
        },
      },
    });

    const admin = await prisma.usuario.create({
      data: { nome: 'Admin', email: 'admin@teste.com' },
    });
    adminId = admin.idUsuario;
    const operador = await prisma.usuario.create({
      data: { nome: 'Operador', email: 'operador@teste.com' },
    });
    operadorId = operador.idUsuario;

    await prisma.usuarioEstabelecimento.createMany({
      data: [
        { usuarioId: adminId, estabelecimentoId: estabId, nivelAcessoId: nivelAdminId },
        { usuarioId: operadorId, estabelecimentoId: estabId, nivelAcessoId: nivelOperacional.idNivelAcesso },
      ],
    });

    // JWT de negócio agora carrega tenantId (o resolverTenant precisa dele).
    tokenAdmin = app.jwt.sign({ sub: adminId, tipo: 'tenant_admin', tenantId });
    tokenOperador = app.jwt.sign({ sub: operadorId, tipo: 'tenant_admin', tenantId });
  });

  afterAll(async () => {
    await app?.close();
    await connectionManager?.encerrar();
    await prisma?.$disconnect();
    await container?.stop();
  });

  it('nega sem token (401)', async () => {
    const res = await app.inject({ method: 'GET', url: '/niveis-acesso' });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('NAO_AUTORIZADO');
  });

  it('nega sem o header x-estabelecimento-id (400)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/niveis-acesso',
      headers: { authorization: `Bearer ${tokenAdmin}` },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('ESTABELECIMENTO_NAO_INFORMADO');
  });

  it('nega quem não tem vínculo com o estabelecimento (404)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/niveis-acesso',
      headers: {
        authorization: `Bearer ${tokenAdmin}`,
        'x-estabelecimento-id': outroEstabId, // admin não tem vínculo na Filial
      },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('SEM_ACESSO_AO_ESTABELECIMENTO');
  });

  it('admin cria nível de acesso (tem configuracoes:niveis_acesso)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/niveis-acesso',
      headers: {
        authorization: `Bearer ${tokenAdmin}`,
        'x-estabelecimento-id': estabId,
      },
      payload: { nome: 'Supervisor', descricao: 'Supervisão de chão de fábrica' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ nome: 'Supervisor', estabelecimentoId: estabId });
  });

  it('operador NÃO cria nível de acesso (403, falta a permissão)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/niveis-acesso',
      headers: {
        authorization: `Bearer ${tokenOperador}`,
        'x-estabelecimento-id': estabId,
      },
      payload: { nome: 'Invasor' },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe('PERMISSAO_NEGADA');
    expect(res.json().error.message).toContain('configuracoes:niveis_acesso');
  });

  it('operador consulta o catálogo de permissões (rota só de contexto)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/permissoes',
      headers: {
        authorization: `Bearer ${tokenOperador}`,
        'x-estabelecimento-id': estabId,
      },
    });
    expect(res.statusCode).toBe(200);
    const chaves = res.json().map((p: { chave: string }) => p.chave);
    expect(chaves).toContain('manufatura:list');
  });

  it('admin vincula um novo usuário ao estabelecimento com nível (fluxo completo)', async () => {
    const criado = await app.inject({
      method: 'POST',
      url: '/usuarios',
      payload: { nome: 'Novato', email: 'novato@teste.com' },
    });
    expect(criado.statusCode).toBe(201);
    const { idUsuario } = criado.json();

    const res = await app.inject({
      method: 'POST',
      url: '/vinculos',
      headers: {
        authorization: `Bearer ${tokenAdmin}`,
        'x-estabelecimento-id': estabId,
      },
      payload: { usuarioId: idUsuario, nivelAcessoId: nivelAdminId },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({
      usuarioId: idUsuario,
      estabelecimentoId: estabId,
      status: 'ATIVO',
    });
  });

  it('rejeita vínculo com nível de OUTRO estabelecimento (422)', async () => {
    const nivelDaFilial = await prisma.nivelAcesso.create({
      data: { nome: 'Gerente Filial', estabelecimentoId: outroEstabId },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/vinculos',
      headers: {
        authorization: `Bearer ${tokenAdmin}`,
        'x-estabelecimento-id': estabId,
      },
      payload: { usuarioId: operadorId, nivelAcessoId: nivelDaFilial.idNivelAcesso },
    });
    // operador já tem vínculo → 409 viria antes; usa um usuário limpo
    // para isolar a regra do nível:
    const limpo = await prisma.usuario.create({
      data: { nome: 'Limpo', email: 'limpo@teste.com' },
    });
    const res2 = await app.inject({
      method: 'POST',
      url: '/vinculos',
      headers: {
        authorization: `Bearer ${tokenAdmin}`,
        'x-estabelecimento-id': estabId,
      },
      payload: { usuarioId: limpo.idUsuario, nivelAcessoId: nivelDaFilial.idNivelAcesso },
    });

    expect([409, 422]).toContain(res.statusCode);
    expect(res2.statusCode).toBe(422);
    expect(res2.json().error.code).toBe('NIVEL_INVALIDO_PARA_ESTABELECIMENTO');
  });

  it('revogação imediata: inativar o vínculo derruba o acesso na request seguinte', async () => {
    // Antes: operador acessa normalmente.
    const antes = await app.inject({
      method: 'GET',
      url: '/permissoes',
      headers: {
        authorization: `Bearer ${tokenOperador}`,
        'x-estabelecimento-id': estabId,
      },
    });
    expect(antes.statusCode).toBe(200);

    // Inativa o vínculo (sem mexer no token!).
    await prisma.usuarioEstabelecimento.update({
      where: {
        usuarioId_estabelecimentoId: { usuarioId: operadorId, estabelecimentoId: estabId },
      },
      data: { status: 'INATIVO' },
    });

    // Depois: mesmo token, acesso negado — permissões não vivem no JWT.
    const depois = await app.inject({
      method: 'GET',
      url: '/permissoes',
      headers: {
        authorization: `Bearer ${tokenOperador}`,
        'x-estabelecimento-id': estabId,
      },
    });
    expect(depois.statusCode).toBe(404);
    expect(depois.json().error.code).toBe('SEM_ACESSO_AO_ESTABELECIMENTO');
  });
});
