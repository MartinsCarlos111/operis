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
 * Integração do módulo `impressoras` (migrado de ImpressoraController/
 * ImpressoraRN/ImpressoraDAO). Impressora é GLOBAL do tenant. Valida:
 *   - CRUD (criar/buscar/listar paginado/editar/excluir)
 *   - autorização por permissão (impressoras:*)
 *   - código único no tenant (AdicionarImpressora)
 *   - 404 em id inexistente
 */
describe('Impressoras (integração)', () => {
  let container: StartedPostgreSqlContainer;
  let prisma: PrismaClient;
  let app: FastifyInstance;
  let connectionManager: ConnectionManager;
  const chaveMestra = Buffer.alloc(32, 7).toString('base64');

  let estabId: string;
  let tokenAdmin: string;
  let tokenOperador: string;

  const authAdmin = () => ({
    authorization: `Bearer ${tokenAdmin}`,
    'x-estabelecimento-id': estabId,
  });

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
    const tenantId = tenant.idTenant;

    // Estabelecimento ativo — necessário para resolver o RBAC do usuário
    // (impressora é global, mas a permissão vem do vínculo no estabelecimento).
    const estab = await prisma.estabelecimento.create({ data: { descricao: 'Matriz' } });
    estabId = estab.idEstabelecimento;

    const permissoes = await Promise.all(
      ['impressoras:list', 'impressoras:create', 'impressoras:update', 'impressoras:delete'].map(
        (chave) =>
          prisma.permissao.create({ data: { chave, grupo: 'impressoras', descricao: chave } }),
      ),
    );

    const nivelAdmin = await prisma.nivelAcesso.create({
      data: {
        nome: 'Administrador',
        estabelecimentoId: estabId,
        permissoes: { create: permissoes.map((p) => ({ permissaoId: p.idPermissao })) },
      },
    });
    const nivelOperador = await prisma.nivelAcesso.create({
      data: { nome: 'Operacional', estabelecimentoId: estabId },
    });

    const admin = await prisma.usuario.create({ data: { nome: 'Admin', email: 'admin@teste.com' } });
    const operador = await prisma.usuario.create({
      data: { nome: 'Operador', email: 'operador@teste.com' },
    });

    await prisma.usuarioEstabelecimento.createMany({
      data: [
        { usuarioId: admin.idUsuario, estabelecimentoId: estabId, nivelAcessoId: nivelAdmin.idNivelAcesso },
        {
          usuarioId: operador.idUsuario,
          estabelecimentoId: estabId,
          nivelAcessoId: nivelOperador.idNivelAcesso,
        },
      ],
    });

    tokenAdmin = app.jwt.sign({ sub: admin.idUsuario, tipo: 'tenant_admin', tenantId });
    tokenOperador = app.jwt.sign({ sub: operador.idUsuario, tipo: 'tenant_admin', tenantId });
  });

  afterAll(async () => {
    await app?.close();
    await connectionManager?.encerrar();
    await prisma?.$disconnect();
    await container?.stop();
  });

  it('nega criação sem token (401)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/impressoras',
      payload: { codigo: 'I1', descricao: 'x', endereco: '1.1.1.1' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('nega criação para quem não tem impressoras:create (403)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/impressoras',
      headers: { authorization: `Bearer ${tokenOperador}`, 'x-estabelecimento-id': estabId },
      payload: { codigo: 'OP', descricao: 'tentativa', endereco: '1.1.1.1' },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe('PERMISSAO_NEGADA');
  });

  it('cria uma impressora (201) no shape do DTO', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/impressoras',
      headers: authAdmin(),
      payload: { codigo: 'ZEB1', descricao: 'Zebra Produção', endereco: '192.168.1.20' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({
      codigo: 'ZEB1',
      descricao: 'Zebra Produção',
      endereco: '192.168.1.20',
    });
    expect(res.json().idImpressora).toBeTruthy();
  });

  it('rejeita código duplicado no tenant (409)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/impressoras',
      headers: authAdmin(),
      payload: { codigo: 'ZEB1', descricao: 'Outra', endereco: '10.0.0.1' },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('CODIGO_IMPRESSORA_JA_EXISTE');
  });

  it('lista paginada { count, model } e filtra por termo', async () => {
    for (const c of ['ARG1', 'GK1']) {
      await app.inject({
        method: 'POST',
        url: '/impressoras',
        headers: authAdmin(),
        payload: { codigo: c, descricao: `Impressora ${c}`, endereco: '10.0.0.9' },
      });
    }

    const pagina = await app.inject({
      method: 'GET',
      url: '/impressoras?startIndex=0&maxRows=2',
      headers: authAdmin(),
    });
    expect(pagina.statusCode).toBe(200);
    expect(pagina.json().count).toBe(3);
    expect(pagina.json().model).toHaveLength(2);

    const filtrada = await app.inject({
      method: 'GET',
      url: '/impressoras?termo=zebra',
      headers: authAdmin(),
    });
    expect(filtrada.json().count).toBe(1);
    expect(filtrada.json().model[0].codigo).toBe('ZEB1');
  });

  it('busca por id (200) e 404 para inexistente', async () => {
    const criada = await app.inject({
      method: 'POST',
      url: '/impressoras',
      headers: authAdmin(),
      payload: { codigo: 'BUS', descricao: 'Buscar', endereco: '2.2.2.2' },
    });
    const { idImpressora } = criada.json();

    const ok = await app.inject({
      method: 'GET',
      url: `/impressoras/${idImpressora}`,
      headers: authAdmin(),
    });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().codigo).toBe('BUS');

    const naoAchou = await app.inject({
      method: 'GET',
      url: '/impressoras/00000000-0000-0000-0000-0000000000ff',
      headers: authAdmin(),
    });
    expect(naoAchou.statusCode).toBe(404);
    expect(naoAchou.json().error.code).toBe('IMPRESSORA_NAO_ENCONTRADA');
  });

  it('edita (200) e exclui (204) uma impressora', async () => {
    const criada = await app.inject({
      method: 'POST',
      url: '/impressoras',
      headers: authAdmin(),
      payload: { codigo: 'EDI', descricao: 'Original', endereco: '3.3.3.3' },
    });
    const { idImpressora } = criada.json();

    const editada = await app.inject({
      method: 'PUT',
      url: `/impressoras/${idImpressora}`,
      headers: authAdmin(),
      payload: { codigo: 'EDI', descricao: 'Editada', endereco: '3.3.3.4' },
    });
    expect(editada.statusCode).toBe(200);
    expect(editada.json()).toMatchObject({ descricao: 'Editada', endereco: '3.3.3.4' });

    const excluida = await app.inject({
      method: 'DELETE',
      url: `/impressoras/${idImpressora}`,
      headers: authAdmin(),
    });
    expect(excluida.statusCode).toBe(204);

    const depois = await app.inject({
      method: 'GET',
      url: `/impressoras/${idImpressora}`,
      headers: authAdmin(),
    });
    expect(depois.statusCode).toBe(404);
  });
});
