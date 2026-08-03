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
 * Integração do vínculo estabelecimento ↔ impressora (migrado de
 * EstabelecimentoImpressoraController). Valida: autorização (impressoras:*),
 * regras do RN (impressora/estab existem, par único), listagens e desvínculo.
 */
describe('Estabelecimento-Impressoras (integração)', () => {
  let container: StartedPostgreSqlContainer;
  let prisma: PrismaClient;
  let app: FastifyInstance;
  let connectionManager: ConnectionManager;
  const chaveMestra = Buffer.alloc(32, 7).toString('base64');

  let estabId: string;
  let outroEstabId: string;
  let impressoraId: string;
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
    const outro = await prisma.estabelecimento.create({ data: { descricao: 'Filial' } });
    outroEstabId = outro.idEstabelecimento;

    const impressora = await prisma.impressora.create({
      data: { codigo: 'ZEB1', descricao: 'Zebra', endereco: '10.0.0.1' },
    });
    impressoraId = impressora.idImpressora;

    const permissoes = await Promise.all(
      ['impressoras:list', 'impressoras:update'].map((chave) =>
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

  const vincular = (idEstabelecimento: string, idImpressora: string) =>
    app.inject({
      method: 'POST',
      url: '/estabelecimento-impressoras',
      headers: authAdmin(),
      payload: { idEstabelecimento, idImpressora },
    });

  it('nega vínculo para quem não tem impressoras:update (403)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/estabelecimento-impressoras',
      headers: { authorization: `Bearer ${tokenOperador}`, 'x-estabelecimento-id': estabId },
      payload: { idEstabelecimento: estabId, idImpressora: impressoraId },
    });
    expect(res.statusCode).toBe(403);
  });

  it('vincula impressora a estabelecimento (201)', async () => {
    const res = await vincular(estabId, impressoraId);
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ idEstabelecimento: estabId, idImpressora: impressoraId });
  });

  it('rejeita vínculo duplicado (409)', async () => {
    const res = await vincular(estabId, impressoraId);
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('VINCULO_ESTAB_IMPRESSORA_JA_EXISTE');
  });

  it('rejeita vínculo com impressora inexistente (404)', async () => {
    const res = await vincular(estabId, '00000000-0000-0000-0000-0000000000ff');
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('IMPRESSORA_INEXISTENTE');
  });

  it('rejeita vínculo com estabelecimento inexistente (404)', async () => {
    const res = await vincular('00000000-0000-0000-0000-0000000000ee', impressoraId);
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('ESTABELECIMENTO_INEXISTENTE');
  });

  it('lista impressoras por estabelecimento e estabelecimentos por impressora', async () => {
    // vincula também ao outro estabelecimento
    await vincular(outroEstabId, impressoraId);

    const porEstab = await app.inject({
      method: 'GET',
      url: `/estabelecimentos/${estabId}/impressoras`,
      headers: authAdmin(),
    });
    expect(porEstab.statusCode).toBe(200);
    expect(porEstab.json().model).toHaveLength(1);
    expect(porEstab.json().model[0].idImpressora).toBe(impressoraId);

    const porImpressora = await app.inject({
      method: 'GET',
      url: `/impressoras/${impressoraId}/estabelecimentos`,
      headers: authAdmin(),
    });
    expect(porImpressora.statusCode).toBe(200);
    // vinculada a Matriz + Filial
    expect(porImpressora.json().model).toHaveLength(2);
  });

  it('desvincula (204) e depois retorna 404 ao desvincular de novo', async () => {
    const del = await app.inject({
      method: 'DELETE',
      url: `/estabelecimento-impressoras/${estabId}/${impressoraId}`,
      headers: authAdmin(),
    });
    expect(del.statusCode).toBe(204);

    const restou = await app.inject({
      method: 'GET',
      url: `/estabelecimentos/${estabId}/impressoras`,
      headers: authAdmin(),
    });
    expect(restou.json().model).toHaveLength(0);

    const denovo = await app.inject({
      method: 'DELETE',
      url: `/estabelecimento-impressoras/${estabId}/${impressoraId}`,
      headers: authAdmin(),
    });
    expect(denovo.statusCode).toBe(404);
    expect(denovo.json().error.code).toBe('VINCULO_ESTAB_IMPRESSORA_NAO_ENCONTRADO');
  });
});
