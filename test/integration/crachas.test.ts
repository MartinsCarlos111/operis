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
 * Integração do módulo `crachas` (migrado de CrachaController). Valida CRUD,
 * autorização (crachas:*), código único, e o cascade crachá→biometria (a
 * tabela de digitais já existe no schema, gerida pelo operis-bio-bridge).
 */
describe('Crachás (integração)', () => {
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

    const estab = await prisma.estabelecimento.create({ data: { descricao: 'Matriz' } });
    estabId = estab.idEstabelecimento;

    const permissoes = await Promise.all(
      ['crachas:list', 'crachas:create', 'crachas:update', 'crachas:delete'].map((chave) =>
        prisma.permissao.create({ data: { chave, grupo: 'crachas', descricao: chave } }),
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

  const criar = (codigo: string, nome = `Pessoa ${codigo}`) =>
    app.inject({
      method: 'POST',
      url: '/crachas',
      headers: authAdmin(),
      payload: { codigo, nome },
    });

  it('nega criação para quem não tem crachas:create (403)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/crachas',
      headers: { authorization: `Bearer ${tokenOperador}`, 'x-estabelecimento-id': estabId },
      payload: { codigo: 'OP', nome: 'x' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('cria crachá (201) no shape do DTO (sem expor biometria)', async () => {
    const res = await criar('0001', 'Carlos');
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ codigo: '0001', nome: 'Carlos', status: 'ATIVO' });
    expect(res.json().idCracha).toBeTruthy();
    // biometria não é campo do DTO do crachá
    expect(res.json().biometrias).toBeUndefined();
  });

  it('rejeita código duplicado (409)', async () => {
    const res = await criar('0001', 'Outro');
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('CODIGO_CRACHA_JA_EXISTE');
  });

  it('valida código/nome obrigatórios (400)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/crachas',
      headers: authAdmin(),
      payload: { codigo: '', nome: '' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('lista paginada { count, model } e filtra por termo', async () => {
    await criar('0002', 'Ana');
    await criar('0003', 'João');

    const pagina = await app.inject({
      method: 'GET',
      url: '/crachas?startIndex=0&maxRows=2',
      headers: authAdmin(),
    });
    expect(pagina.statusCode).toBe(200);
    expect(pagina.json().count).toBe(3);
    expect(pagina.json().model).toHaveLength(2);

    const filtrada = await app.inject({
      method: 'GET',
      url: '/crachas?termo=ana',
      headers: authAdmin(),
    });
    expect(filtrada.json().count).toBe(1);
    expect(filtrada.json().model[0].nome).toBe('Ana');
  });

  it('busca por id (200) e 404 para inexistente', async () => {
    const criado = await criar('0009', 'Busca');
    const { idCracha } = criado.json();

    const ok = await app.inject({ method: 'GET', url: `/crachas/${idCracha}`, headers: authAdmin() });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().nome).toBe('Busca');

    const naoAchou = await app.inject({
      method: 'GET',
      url: '/crachas/00000000-0000-0000-0000-0000000000ff',
      headers: authAdmin(),
    });
    expect(naoAchou.statusCode).toBe(404);
    expect(naoAchou.json().error.code).toBe('CRACHA_NAO_ENCONTRADO');
  });

  it('edita (200) e exclui removendo as digitais por cascade (204)', async () => {
    const criado = await criar('0010', 'Original');
    const { idCracha } = criado.json();

    const editado = await app.inject({
      method: 'PUT',
      url: `/crachas/${idCracha}`,
      headers: authAdmin(),
      payload: { codigo: '0010', nome: 'Editado', status: 'INATIVO' },
    });
    expect(editado.statusCode).toBe(200);
    expect(editado.json()).toMatchObject({ nome: 'Editado', status: 'INATIVO' });

    // cadastra uma digital diretamente (o enroll real é do bio-bridge)
    await prisma.crachaBiometria.create({
      data: {
        crachaId: idCracha,
        dedo: 'POLEGAR_DIREITO',
        templateCifrado: 'cifrado-fake',
        versaoCripto: 1,
        formato: 'NITGEN',
      },
    });

    const del = await app.inject({
      method: 'DELETE',
      url: `/crachas/${idCracha}`,
      headers: authAdmin(),
    });
    expect(del.statusCode).toBe(204);

    // crachá sumiu e a digital caiu por cascade
    const orfas = await prisma.crachaBiometria.count({ where: { crachaId: idCracha } });
    expect(orfas).toBe(0);
  });
});
