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
 * Integração do vínculo área ↔ usuário (migrado de AreaUsuarioController).
 * Valida autorização (areas:*), regras do RN (área/usuário existem, par único),
 * listagens e desvínculo.
 */
describe('Área-Usuários (integração)', () => {
  let container: StartedPostgreSqlContainer;
  let prisma: PrismaClient;
  let app: FastifyInstance;
  let connectionManager: ConnectionManager;
  const chaveMestra = Buffer.alloc(32, 7).toString('base64');

  let estabId: string;
  let areaId: string;
  let usuarioAlvoId: string;
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

    const estab = await prisma.estabelecimento.create({ data: { descricao: 'Matriz' } });
    estabId = estab.idEstabelecimento;

    const area = await prisma.area.create({
      data: { codigo: 'PROD', descricao: 'Produção', estabelecimentoId: estabId },
    });
    areaId = area.idArea;

    const permissoes = await Promise.all(
      ['areas:list', 'areas:update'].map((chave) =>
        prisma.permissao.create({ data: { chave, grupo: 'areas', descricao: chave } }),
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
    // usuário-alvo do vínculo (distinto de quem administra)
    const alvo = await prisma.usuario.create({ data: { nome: 'Alvo', email: 'alvo@teste.com' } });
    usuarioAlvoId = alvo.idUsuario;

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

  const vincular = (idArea: string, idUsuario: string) =>
    app.inject({
      method: 'POST',
      url: '/area-usuarios',
      headers: authAdmin(),
      payload: { idArea, idUsuario },
    });

  it('nega vínculo para quem não tem areas:update (403)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/area-usuarios',
      headers: { authorization: `Bearer ${tokenOperador}`, 'x-estabelecimento-id': estabId },
      payload: { idArea: areaId, idUsuario: usuarioAlvoId },
    });
    expect(res.statusCode).toBe(403);
  });

  it('vincula usuário a área (201)', async () => {
    const res = await vincular(areaId, usuarioAlvoId);
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ idArea: areaId, idUsuario: usuarioAlvoId });
  });

  it('rejeita vínculo duplicado (409)', async () => {
    const res = await vincular(areaId, usuarioAlvoId);
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('VINCULO_AREA_USUARIO_JA_EXISTE');
  });

  it('rejeita vínculo com área inexistente (404)', async () => {
    const res = await vincular('00000000-0000-0000-0000-0000000000ff', usuarioAlvoId);
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('AREA_INEXISTENTE');
  });

  it('rejeita vínculo com usuário inexistente (404)', async () => {
    const res = await vincular(areaId, '00000000-0000-0000-0000-0000000000ee');
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('USUARIO_INEXISTENTE');
  });

  it('lista usuários por área e áreas por usuário', async () => {
    const porArea = await app.inject({
      method: 'GET',
      url: `/areas/${areaId}/usuarios`,
      headers: authAdmin(),
    });
    expect(porArea.statusCode).toBe(200);
    expect(porArea.json().model).toHaveLength(1);
    expect(porArea.json().model[0].idUsuario).toBe(usuarioAlvoId);

    const porUsuario = await app.inject({
      method: 'GET',
      url: `/usuarios/${usuarioAlvoId}/areas`,
      headers: authAdmin(),
    });
    expect(porUsuario.statusCode).toBe(200);
    expect(porUsuario.json().model).toHaveLength(1);
    expect(porUsuario.json().model[0].idArea).toBe(areaId);
  });

  it('desvincula (204) e retorna 404 ao desvincular de novo', async () => {
    const del = await app.inject({
      method: 'DELETE',
      url: `/area-usuarios/${areaId}/${usuarioAlvoId}`,
      headers: authAdmin(),
    });
    expect(del.statusCode).toBe(204);

    const restou = await app.inject({
      method: 'GET',
      url: `/areas/${areaId}/usuarios`,
      headers: authAdmin(),
    });
    expect(restou.json().model).toHaveLength(0);

    const denovo = await app.inject({
      method: 'DELETE',
      url: `/area-usuarios/${areaId}/${usuarioAlvoId}`,
      headers: authAdmin(),
    });
    expect(denovo.statusCode).toBe(404);
    expect(denovo.json().error.code).toBe('VINCULO_AREA_USUARIO_NAO_ENCONTRADO');
  });
});
