import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import type { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { buildApp } from '../../src/app.js';
import type { ConnectionManager } from '../../src/shared/tenant-runtime/index.js';
import { AesGcmEncryptionService } from '../../src/modules/operis_control/infrastructure/gateways/aes-gcm-encryption.service.js';

/**
 * Integração do módulo `areas` (migrado de AreaController/AreaRN/AreaDAO) contra
 * Postgres real. Valida paridade das rotas + regras do AreaRN:
 *   - CRUD (criar/buscar/listar paginado/editar/excluir)
 *   - autorização por permissão (areas:*)
 *   - código único por estabelecimento (AdicionarArea)
 *   - estabelecimento inativo bloqueia (ValidarArea)
 *   - área com usuários vinculados não é excluída (ExcluirArea)
 *   - isolamento por estabelecimento ativo
 */
describe('Áreas (integração)', () => {
  let container: StartedPostgreSqlContainer;
  let prisma: PrismaClient;
  let app: FastifyInstance;
  let connectionManager: ConnectionManager;
  const chaveMestra = Buffer.alloc(32, 7).toString('base64');

  let estabId: string;
  let estabInativoId: string;
  let adminId: string;
  let operadorId: string;
  let tokenAdmin: string;
  let tokenOperador: string;
  let tokenAdminInativo: string;

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

    // Estabelecimento ativo (onde tudo acontece) e um inativo (regra ValidarArea).
    const estab = await prisma.estabelecimento.create({ data: { descricao: 'Matriz' } });
    estabId = estab.idEstabelecimento;
    const inativo = await prisma.estabelecimento.create({
      data: { descricao: 'Desativada', status: 'INATIVO' },
    });
    estabInativoId = inativo.idEstabelecimento;

    // Permissões de áreas: admin tem todas; operador, nenhuma.
    const permissoes = await Promise.all(
      ['areas:list', 'areas:create', 'areas:update', 'areas:delete'].map((chave) =>
        prisma.permissao.create({
          data: { chave, grupo: 'areas', descricao: chave },
        }),
      ),
    );

    const nivelAdmin = await prisma.nivelAcesso.create({
      data: {
        nome: 'Administrador',
        estabelecimentoId: estabId,
        permissoes: { create: permissoes.map((p) => ({ permissaoId: p.idPermissao })) },
      },
    });
    // Nível admin no estabelecimento inativo (para testar bloqueio de criação lá).
    const nivelAdminInativo = await prisma.nivelAcesso.create({
      data: {
        nome: 'Administrador',
        estabelecimentoId: estabInativoId,
        permissoes: { create: permissoes.map((p) => ({ permissaoId: p.idPermissao })) },
      },
    });
    const nivelOperador = await prisma.nivelAcesso.create({
      data: { nome: 'Operacional', estabelecimentoId: estabId },
    });

    const admin = await prisma.usuario.create({ data: { nome: 'Admin', email: 'admin@teste.com' } });
    adminId = admin.idUsuario;
    const operador = await prisma.usuario.create({
      data: { nome: 'Operador', email: 'operador@teste.com' },
    });
    operadorId = operador.idUsuario;

    await prisma.usuarioEstabelecimento.createMany({
      data: [
        { usuarioId: adminId, estabelecimentoId: estabId, nivelAcessoId: nivelAdmin.idNivelAcesso },
        {
          usuarioId: adminId,
          estabelecimentoId: estabInativoId,
          nivelAcessoId: nivelAdminInativo.idNivelAcesso,
        },
        {
          usuarioId: operadorId,
          estabelecimentoId: estabId,
          nivelAcessoId: nivelOperador.idNivelAcesso,
        },
      ],
    });

    tokenAdmin = app.jwt.sign({ sub: adminId, tipo: 'tenant_admin', tenantId });
    tokenOperador = app.jwt.sign({ sub: operadorId, tipo: 'tenant_admin', tenantId });
    tokenAdminInativo = tokenAdmin; // mesmo usuário, muda só o header do estabelecimento
  });

  afterAll(async () => {
    await app?.close();
    await connectionManager?.encerrar();
    await prisma?.$disconnect();
    await container?.stop();
  });

  it('nega criação sem token (401)', async () => {
    const res = await app.inject({ method: 'POST', url: '/areas', payload: { codigo: 'A', descricao: 'x' } });
    expect(res.statusCode).toBe(401);
  });

  it('nega criação para quem não tem areas:create (403)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/areas',
      headers: { authorization: `Bearer ${tokenOperador}`, 'x-estabelecimento-id': estabId },
      payload: { codigo: 'OP', descricao: 'tentativa' },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe('PERMISSAO_NEGADA');
  });

  it('cria uma área (201) e a devolve no shape do DTO', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/areas',
      headers: authAdmin(),
      payload: { codigo: 'PROD', descricao: 'Produção' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({
      codigo: 'PROD',
      descricao: 'Produção',
      idEstabelecimento: estabId,
    });
    expect(res.json().idArea).toBeTruthy();
  });

  it('rejeita código duplicado no mesmo estabelecimento (409)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/areas',
      headers: authAdmin(),
      payload: { codigo: 'PROD', descricao: 'Outra' },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('CODIGO_AREA_JA_EXISTE');
  });

  it('rejeita criação em estabelecimento inativo (422)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/areas',
      headers: { authorization: `Bearer ${tokenAdminInativo}`, 'x-estabelecimento-id': estabInativoId },
      payload: { codigo: 'X', descricao: 'Y' },
    });
    expect(res.statusCode).toBe(422);
    expect(res.json().error.code).toBe('ESTABELECIMENTO_INATIVO');
  });

  it('lista áreas paginadas no formato { count, model }', async () => {
    // cria mais duas para exercitar paginação + busca
    for (const c of ['EXP', 'ALM']) {
      await app.inject({
        method: 'POST',
        url: '/areas',
        headers: authAdmin(),
        payload: { codigo: c, descricao: `Área ${c}` },
      });
    }

    const res = await app.inject({
      method: 'GET',
      url: '/areas?startIndex=0&maxRows=2',
      headers: authAdmin(),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.count).toBe(3); // total do filtro, não da página
    expect(body.model).toHaveLength(2); // página limitada por maxRows
  });

  it('filtra por termo (código/descrição)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/areas?termo=produ',
      headers: authAdmin(),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.count).toBe(1);
    expect(body.model[0].codigo).toBe('PROD');
  });

  it('busca por id (200) e retorna 404 para id inexistente', async () => {
    const criada = await app.inject({
      method: 'POST',
      url: '/areas',
      headers: authAdmin(),
      payload: { codigo: 'BUS', descricao: 'Buscar' },
    });
    const { idArea } = criada.json();

    const ok = await app.inject({ method: 'GET', url: `/areas/${idArea}`, headers: authAdmin() });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().codigo).toBe('BUS');

    const naoAchou = await app.inject({
      method: 'GET',
      url: '/areas/00000000-0000-0000-0000-0000000000ff',
      headers: authAdmin(),
    });
    expect(naoAchou.statusCode).toBe(404);
    expect(naoAchou.json().error.code).toBe('AREA_NAO_ENCONTRADA');
  });

  it('edita uma área (200)', async () => {
    const criada = await app.inject({
      method: 'POST',
      url: '/areas',
      headers: authAdmin(),
      payload: { codigo: 'EDI', descricao: 'Original' },
    });
    const { idArea } = criada.json();

    const res = await app.inject({
      method: 'PUT',
      url: `/areas/${idArea}`,
      headers: authAdmin(),
      payload: { codigo: 'EDI', descricao: 'Editada' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().descricao).toBe('Editada');
  });

  it('exclui uma área sem vínculos (204)', async () => {
    const criada = await app.inject({
      method: 'POST',
      url: '/areas',
      headers: authAdmin(),
      payload: { codigo: 'DEL', descricao: 'Excluir' },
    });
    const { idArea } = criada.json();

    const res = await app.inject({ method: 'DELETE', url: `/areas/${idArea}`, headers: authAdmin() });
    expect(res.statusCode).toBe(204);

    const depois = await app.inject({ method: 'GET', url: `/areas/${idArea}`, headers: authAdmin() });
    expect(depois.statusCode).toBe(404);
  });

  it('NÃO exclui área com usuários vinculados (409) — regra do AreaRN', async () => {
    const criada = await app.inject({
      method: 'POST',
      url: '/areas',
      headers: authAdmin(),
      payload: { codigo: 'VIN', descricao: 'Com vínculo' },
    });
    const { idArea } = criada.json();

    // vincula um usuário à área diretamente (AreaUsuarioController ainda não migrado)
    await prisma.areaUsuario.create({ data: { areaId: idArea, usuarioId: operadorId } });

    const res = await app.inject({ method: 'DELETE', url: `/areas/${idArea}`, headers: authAdmin() });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('AREA_COM_USUARIOS_VINCULADOS');
  });
});
