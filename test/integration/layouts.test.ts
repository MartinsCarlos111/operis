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
 * Integração do módulo `layouts` (migrado de VariavelLayoutController +
 * LayoutEtiquetaController). Cobre os dois recursos: variáveis de layout e
 * layouts de etiqueta (ZPL). Valida CRUD, autorização (layouts:*), código único.
 */
describe('Layouts de etiqueta (integração)', () => {
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
      ['layouts:list', 'layouts:create', 'layouts:update', 'layouts:delete'].map((chave) =>
        prisma.permissao.create({ data: { chave, grupo: 'layouts', descricao: chave } }),
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

  // ─── Variáveis de layout ───────────────────────────────────────────────────
  it('nega criação de variável sem permissão layouts:create (403)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/variaveis-layout',
      headers: { authorization: `Bearer ${tokenOperador}`, 'x-estabelecimento-id': estabId },
      payload: { codigo: 'LOTE', descricao: 'Número do lote' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('CRUD de variável de layout (criar/duplicado/listar/editar/excluir)', async () => {
    const criada = await app.inject({
      method: 'POST',
      url: '/variaveis-layout',
      headers: authAdmin(),
      payload: {
        codigo: 'LOTE',
        descricao: 'Número do lote',
        campoEtiquetaManufatura: 'MOV.LOTE',
      },
    });
    expect(criada.statusCode).toBe(201);
    expect(criada.json()).toMatchObject({ codigo: 'LOTE', campoEtiquetaManufatura: 'MOV.LOTE' });
    const { idVariavel } = criada.json();

    // duplicado
    const dup = await app.inject({
      method: 'POST',
      url: '/variaveis-layout',
      headers: authAdmin(),
      payload: { codigo: 'LOTE', descricao: 'Outra' },
    });
    expect(dup.statusCode).toBe(409);
    expect(dup.json().error.code).toBe('CODIGO_VARIAVEL_JA_EXISTE');

    // listar
    const lista = await app.inject({ method: 'GET', url: '/variaveis-layout', headers: authAdmin() });
    expect(lista.json().count).toBe(1);

    // editar
    const editada = await app.inject({
      method: 'PUT',
      url: `/variaveis-layout/${idVariavel}`,
      headers: authAdmin(),
      payload: { codigo: 'LOTE', descricao: 'Lote de produção' },
    });
    expect(editada.statusCode).toBe(200);
    expect(editada.json().descricao).toBe('Lote de produção');

    // excluir
    const del = await app.inject({
      method: 'DELETE',
      url: `/variaveis-layout/${idVariavel}`,
      headers: authAdmin(),
    });
    expect(del.statusCode).toBe(204);

    const naoAchou = await app.inject({
      method: 'GET',
      url: `/variaveis-layout/${idVariavel}`,
      headers: authAdmin(),
    });
    expect(naoAchou.statusCode).toBe(404);
    expect(naoAchou.json().error.code).toBe('VARIAVEL_LAYOUT_NAO_ENCONTRADA');
  });

  // ─── Layouts de etiqueta ───────────────────────────────────────────────────
  it('CRUD de layout de etiqueta preservando o ZPL', async () => {
    const zpl = '^XA^FO50,50^A0N,50,50^FDOperis^FS^XZ';
    const criado = await app.inject({
      method: 'POST',
      url: '/layouts-etiqueta',
      headers: authAdmin(),
      payload: { codigo: 'CX-PADRAO', descricao: 'Caixa padrão', zpl },
    });
    expect(criado.statusCode).toBe(201);
    expect(criado.json()).toMatchObject({ codigo: 'CX-PADRAO', zpl });
    const { idLayout } = criado.json();

    // duplicado
    const dup = await app.inject({
      method: 'POST',
      url: '/layouts-etiqueta',
      headers: authAdmin(),
      payload: { codigo: 'CX-PADRAO', descricao: 'Outro' },
    });
    expect(dup.statusCode).toBe(409);
    expect(dup.json().error.code).toBe('CODIGO_LAYOUT_JA_EXISTE');

    // buscar devolve o ZPL intacto
    const busca = await app.inject({
      method: 'GET',
      url: `/layouts-etiqueta/${idLayout}`,
      headers: authAdmin(),
    });
    expect(busca.json().zpl).toBe(zpl);

    // editar o ZPL
    const novoZpl = '^XA^FO0,0^FDNovo^FS^XZ';
    const editado = await app.inject({
      method: 'PUT',
      url: `/layouts-etiqueta/${idLayout}`,
      headers: authAdmin(),
      payload: { codigo: 'CX-PADRAO', descricao: 'Caixa padrão', zpl: novoZpl },
    });
    expect(editado.statusCode).toBe(200);
    expect(editado.json().zpl).toBe(novoZpl);

    // excluir
    const del = await app.inject({
      method: 'DELETE',
      url: `/layouts-etiqueta/${idLayout}`,
      headers: authAdmin(),
    });
    expect(del.statusCode).toBe(204);
  });
});
