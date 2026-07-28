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
 * Integração do módulo `notificacoes` (migrado de RegraNotificacaoController +
 * CondicaoNotificacaoController). Escopo: cadastro de regra + condições (1:N).
 * Valida CRUD, autorização (notificacoes:*), código único, e cascade regra→condição.
 */
describe('Notificações (integração)', () => {
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

  const criarRegra = (codigo: string) =>
    app.inject({
      method: 'POST',
      url: '/regras-notificacao',
      headers: authAdmin(),
      payload: {
        codigo,
        descricao: `Regra ${codigo}`,
        tabela: 'MOVIMENTOS',
        conteudo: 'Ocorreu um evento',
      },
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
      ['notificacoes:list', 'notificacoes:create', 'notificacoes:update', 'notificacoes:delete'].map(
        (chave) =>
          prisma.permissao.create({ data: { chave, grupo: 'notificacoes', descricao: chave } }),
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
      url: '/regras-notificacao',
      payload: { codigo: 'R', descricao: 'x', tabela: 't', conteudo: 'c' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('nega criação para quem não tem notificacoes:create (403)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/regras-notificacao',
      headers: { authorization: `Bearer ${tokenOperador}`, 'x-estabelecimento-id': estabId },
      payload: { codigo: 'OP', descricao: 'x', tabela: 't', conteudo: 'c' },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe('PERMISSAO_NEGADA');
  });

  it('cria regra (201) no shape do DTO', async () => {
    const res = await criarRegra('MOV-ATRASO');
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({
      codigo: 'MOV-ATRASO',
      tabela: 'MOVIMENTOS',
      conteudo: 'Ocorreu um evento',
      status: 'ATIVO',
    });
    expect(res.json().idRegraNotificacao).toBeTruthy();
  });

  it('rejeita código de regra duplicado (409)', async () => {
    const res = await criarRegra('MOV-ATRASO');
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('CODIGO_REGRA_JA_EXISTE');
  });

  it('lista regras paginadas { count, model } e filtra por termo', async () => {
    await criarRegra('OP-PARADA');

    const pagina = await app.inject({
      method: 'GET',
      url: '/regras-notificacao?startIndex=0&maxRows=1',
      headers: authAdmin(),
    });
    expect(pagina.statusCode).toBe(200);
    expect(pagina.json().count).toBe(2);
    expect(pagina.json().model).toHaveLength(1);

    const filtrada = await app.inject({
      method: 'GET',
      url: '/regras-notificacao?termo=parada',
      headers: authAdmin(),
    });
    expect(filtrada.json().count).toBe(1);
    expect(filtrada.json().model[0].codigo).toBe('OP-PARADA');
  });

  it('gerencia condições de uma regra (criar/listar/editar/excluir)', async () => {
    const regra = await criarRegra('REG-COND');
    const idRegra = regra.json().idRegraNotificacao;

    // cria duas condições
    const c1 = await app.inject({
      method: 'POST',
      url: `/regras-notificacao/${idRegra}/condicoes`,
      headers: authAdmin(),
      payload: { campo: 'quantidade', operador: '>', valor: '100' },
    });
    expect(c1.statusCode).toBe(201);
    expect(c1.json()).toMatchObject({ idRegraNotificacao: idRegra, campo: 'quantidade' });

    await app.inject({
      method: 'POST',
      url: `/regras-notificacao/${idRegra}/condicoes`,
      headers: authAdmin(),
      payload: { campo: 'status', operador: '=', valor: 'ATRASADO' },
    });

    // lista
    const lista = await app.inject({
      method: 'GET',
      url: `/regras-notificacao/${idRegra}/condicoes`,
      headers: authAdmin(),
    });
    expect(lista.json().count).toBe(2);

    // edita a primeira
    const editada = await app.inject({
      method: 'PUT',
      url: `/condicoes-notificacao/${c1.json().idCondicaoNotificacao}`,
      headers: authAdmin(),
      payload: { campo: 'quantidade', operador: '>=', valor: '200' },
    });
    expect(editada.statusCode).toBe(200);
    expect(editada.json()).toMatchObject({ operador: '>=', valor: '200' });

    // exclui a primeira
    const excluida = await app.inject({
      method: 'DELETE',
      url: `/condicoes-notificacao/${c1.json().idCondicaoNotificacao}`,
      headers: authAdmin(),
    });
    expect(excluida.statusCode).toBe(204);

    const restante = await app.inject({
      method: 'GET',
      url: `/regras-notificacao/${idRegra}/condicoes`,
      headers: authAdmin(),
    });
    expect(restante.json().count).toBe(1);
  });

  it('rejeita condição para regra inexistente (404)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/regras-notificacao/00000000-0000-0000-0000-0000000000ff/condicoes',
      headers: authAdmin(),
      payload: { campo: 'x', operador: '=', valor: '1' },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('REGRA_NOTIFICACAO_NAO_ENCONTRADA');
  });

  it('excluir a regra remove suas condições (cascade)', async () => {
    const regra = await criarRegra('REG-CASCADE');
    const idRegra = regra.json().idRegraNotificacao;

    await app.inject({
      method: 'POST',
      url: `/regras-notificacao/${idRegra}/condicoes`,
      headers: authAdmin(),
      payload: { campo: 'a', operador: '=', valor: '1' },
    });

    const del = await app.inject({
      method: 'DELETE',
      url: `/regras-notificacao/${idRegra}`,
      headers: authAdmin(),
    });
    expect(del.statusCode).toBe(204);

    // a regra sumiu (404) e as condições foram removidas por cascade
    const busca = await app.inject({
      method: 'GET',
      url: `/regras-notificacao/${idRegra}`,
      headers: authAdmin(),
    });
    expect(busca.statusCode).toBe(404);

    const orfas = await prisma.condicaoNotificacao.count({
      where: { regraNotificacaoId: idRegra },
    });
    expect(orfas).toBe(0);
  });
});
