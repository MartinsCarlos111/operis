import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { CriarTenantUseCase } from '../../application/use-cases/criar-tenant.use-case.js';
import type { ListarTenantsUseCase } from '../../application/use-cases/listar-tenants.use-case.js';
import type { TestarConexaoTenantUseCase } from '../../application/use-cases/testar-conexao-tenant.use-case.js';
import type { CriarSuperAdminUseCase } from '../../application/use-cases/criar-super-admin.use-case.js';
import type { AutenticarSuperAdminUseCase } from '../../application/use-cases/autenticar-super-admin.use-case.js';
import type { AutenticarTenantAdministradorUseCase } from '../../application/use-cases/autenticar-tenant-administrador.use-case.js';
import type { ConfigurarRabbitMqTenantUseCase } from '../../application/use-cases/configurar-rabbitmq-tenant.use-case.js';
import type { ObterRabbitMqTenantUseCase } from '../../application/use-cases/obter-rabbitmq-tenant.use-case.js';
import type { MonitorarBrokerTenantUseCase } from '../../application/use-cases/monitorar-broker-tenant.use-case.js';
import type { ConfigurarSmtpTenantUseCase } from '../../application/use-cases/configurar-smtp-tenant.use-case.js';
import type { ObterSmtpTenantUseCase } from '../../application/use-cases/obter-smtp-tenant.use-case.js';
import type { ConfigurarMinioTenantUseCase } from '../../application/use-cases/configurar-minio-tenant.use-case.js';
import type { ObterMinioTenantUseCase } from '../../application/use-cases/obter-minio-tenant.use-case.js';
import { autenticarSuperAdmin } from './autenticacao-admin.js';

const loginBody = z.object({
  email: z.string().min(1),
  senha: z.string().min(1),
});

const criarSuperAdminBody = z.object({
  nome: z.string().min(2),
  email: z.string().min(1),
  senha: z.string().min(8),
});

const criarTenantBody = z.object({
  nome: z.string().min(2),
  slug: z.string().min(2),
  banco: z.object({
    host: z.string().min(1),
    porta: z.number().int().min(1).max(65535),
    nomeBanco: z.string().min(1),
    usuario: z.string().min(1),
    senha: z.string().min(1),
    sslHabilitado: z.boolean().optional(),
  }),
  administrador: z.object({
    nome: z.string().min(2),
    email: z.string().min(1),
    senha: z.string().min(8),
  }),
  provisionarSchema: z.boolean().optional(),
});

const tenantParams = z.object({ id: z.string().uuid() });

/** Config do broker RabbitMQ do tenant. `senha` é texto puro só em trânsito. */
const configurarRabbitMqBody = z.object({
  host: z.string().min(1),
  porta: z.number().int().min(1).max(65535),
  usuario: z.string().min(1),
  senha: z.string().min(1),
  virtualHost: z.string().optional(),
  sslHabilitado: z.boolean().optional(),
});

/** Config do servidor SMTP do tenant. `senha` é texto puro só em trânsito. */
const configurarSmtpBody = z.object({
  host: z.string().min(1),
  porta: z.number().int().min(1).max(65535),
  usuario: z.string().min(1),
  senha: z.string().min(1),
  remetente: z.string().optional(),
  sslHabilitado: z.boolean().optional(),
});

/** Config do object storage MinIO do tenant. `secretKey` é texto puro só em trânsito. */
const configurarMinioBody = z.object({
  host: z.string().min(1),
  porta: z.number().int().min(1).max(65535),
  bucket: z.string().min(1),
  accessKey: z.string().min(1),
  secretKey: z.string().min(1),
  sslHabilitado: z.boolean().optional(),
  pathStyleAccess: z.boolean().optional(),
});

const VALIDADE_TOKEN = '8h';

export interface AdminRoutesDeps {
  autenticarSuperAdminUseCase: AutenticarSuperAdminUseCase;
  autenticarTenantAdministrador: AutenticarTenantAdministradorUseCase;
  criarSuperAdmin: CriarSuperAdminUseCase;
  criarTenant: CriarTenantUseCase;
  listarTenants: ListarTenantsUseCase;
  testarConexaoTenant: TestarConexaoTenantUseCase;
  configurarRabbitMqTenant: ConfigurarRabbitMqTenantUseCase;
  obterRabbitMqTenant: ObterRabbitMqTenantUseCase;
  monitorarBrokerTenant: MonitorarBrokerTenantUseCase;
  configurarSmtpTenant: ConfigurarSmtpTenantUseCase;
  obterSmtpTenant: ObterSmtpTenantUseCase;
  configurarMinioTenant: ConfigurarMinioTenantUseCase;
  obterMinioTenant: ObterMinioTenantUseCase;
}

/**
 * Rotas do Control Plane. Tudo sob /admin é exclusivo de super-admins (painel
 * interno); /auth/login é a porta de entrada do administrador de tenant
 * (cliente). O JWT é assinado AQUI (infra) — os use-cases só validam identidade.
 */
export function adminRoutes(deps: AdminRoutesDeps) {
  const segurancaAdmin = [{ bearerAuth: [] }];

  return async function plugin(fastify: FastifyInstance): Promise<void> {
    const app = fastify.withTypeProvider<ZodTypeProvider>();

    // ── Autenticação isolada do super-admin (painel interno) ──
    app.post(
      '/admin/auth/login',
      {
        schema: {
          tags: ['admin', 'auth'],
          summary: 'Login do super-admin (painel interno) → JWT',
          body: loginBody,
        },
      },
      async (request, reply) => {
        const superAdmin = await deps.autenticarSuperAdminUseCase.executar(request.body);
        const token = app.jwt.sign(
          { sub: superAdmin.idSuperAdmin, tipo: 'super_admin' },
          { expiresIn: VALIDADE_TOKEN },
        );
        return reply.status(200).send({ token, superAdmin });
      },
    );

    app.post(
      '/admin/super-admins',
      {
        preHandler: [autenticarSuperAdmin],
        schema: {
          tags: ['admin'],
          summary: 'Cria outro super-admin',
          security: segurancaAdmin,
          body: criarSuperAdminBody,
        },
      },
      async (request, reply) => {
        const dto = await deps.criarSuperAdmin.executar(request.body);
        return reply.status(201).send(dto);
      },
    );

    // ── Gestão de tenants (só super-admins sabem que existem) ──
    app.get(
      '/admin/tenants',
      {
        preHandler: [autenticarSuperAdmin],
        schema: { tags: ['admin'], summary: 'Lista os tenants', security: segurancaAdmin },
      },
      async (_request, reply) => {
        const dtos = await deps.listarTenants.executar();
        return reply.status(200).send(dtos);
      },
    );

    app.post(
      '/admin/tenants',
      {
        preHandler: [autenticarSuperAdmin],
        schema: {
          tags: ['admin'],
          summary: 'Provisiona um tenant: valida conexão, cifra senha, aplica schema, cria admin',
          security: segurancaAdmin,
          body: criarTenantBody,
        },
      },
      async (request, reply) => {
        const resultado = await deps.criarTenant.executar(request.body);
        return reply.status(201).send(resultado);
      },
    );

    app.post(
      '/admin/tenants/:id/testar-conexao',
      {
        preHandler: [autenticarSuperAdmin],
        schema: {
          tags: ['admin'],
          summary: 'Testa a conexão com o banco do tenant e registra o resultado',
          security: segurancaAdmin,
          params: tenantParams,
        },
      },
      async (request, reply) => {
        const dto = await deps.testarConexaoTenant.executar(request.params.id);
        return reply.status(200).send(dto);
      },
    );

    // ── Configuração RabbitMQ do tenant (broker dedicado; senha cifrada) ──
    app.put(
      '/admin/tenants/:id/rabbitmq',
      {
        preHandler: [autenticarSuperAdmin],
        schema: {
          tags: ['admin'],
          summary: 'Cadastra/atualiza o broker RabbitMQ do tenant (senha cifrada)',
          security: segurancaAdmin,
          params: tenantParams,
          body: configurarRabbitMqBody,
        },
      },
      async (request, reply) => {
        const dto = await deps.configurarRabbitMqTenant.executar({
          tenantId: request.params.id,
          ...request.body,
        });
        return reply.status(200).send(dto);
      },
    );

    app.get(
      '/admin/tenants/:id/rabbitmq',
      {
        preHandler: [autenticarSuperAdmin],
        schema: {
          tags: ['admin'],
          summary: 'Obtém a config RabbitMQ do tenant (sem a senha)',
          security: segurancaAdmin,
          params: tenantParams,
        },
      },
      async (request, reply) => {
        const dto = await deps.obterRabbitMqTenant.executar(request.params.id);
        return reply.status(200).send(dto);
      },
    );

    // Retrato operacional do broker: valida a conexão e lista os coletores
    // conectados (client_id). Alimenta a tela "Broker IoT".
    app.get(
      '/admin/tenants/:id/rabbitmq/monitor',
      {
        preHandler: [autenticarSuperAdmin],
        schema: {
          tags: ['admin'],
          summary: 'Estado do broker do tenant e coletores conectados',
          security: segurancaAdmin,
          params: tenantParams,
        },
      },
      async (request, reply) => {
        const dto = await deps.monitorarBrokerTenant.executar(request.params.id);
        return reply.status(200).send(dto);
      },
    );

    // ── Configuração SMTP do tenant (servidor de e-mail; senha cifrada) ──
    app.put(
      '/admin/tenants/:id/smtp',
      {
        preHandler: [autenticarSuperAdmin],
        schema: {
          tags: ['admin'],
          summary: 'Cadastra/atualiza o servidor SMTP do tenant (senha cifrada)',
          security: segurancaAdmin,
          params: tenantParams,
          body: configurarSmtpBody,
        },
      },
      async (request, reply) => {
        const dto = await deps.configurarSmtpTenant.executar({
          tenantId: request.params.id,
          ...request.body,
        });
        return reply.status(200).send(dto);
      },
    );

    app.get(
      '/admin/tenants/:id/smtp',
      {
        preHandler: [autenticarSuperAdmin],
        schema: {
          tags: ['admin'],
          summary: 'Obtém a config SMTP do tenant (sem a senha)',
          security: segurancaAdmin,
          params: tenantParams,
        },
      },
      async (request, reply) => {
        const dto = await deps.obterSmtpTenant.executar(request.params.id);
        return reply.status(200).send(dto);
      },
    );

    // ── Configuração MinIO do tenant (object storage; secret cifrado) ──
    app.put(
      '/admin/tenants/:id/minio',
      {
        preHandler: [autenticarSuperAdmin],
        schema: {
          tags: ['admin'],
          summary: 'Cadastra/atualiza o object storage MinIO do tenant (secret cifrado)',
          security: segurancaAdmin,
          params: tenantParams,
          body: configurarMinioBody,
        },
      },
      async (request, reply) => {
        const dto = await deps.configurarMinioTenant.executar({
          tenantId: request.params.id,
          ...request.body,
        });
        return reply.status(200).send(dto);
      },
    );

    app.get(
      '/admin/tenants/:id/minio',
      {
        preHandler: [autenticarSuperAdmin],
        schema: {
          tags: ['admin'],
          summary: 'Obtém a config MinIO do tenant (sem o secret)',
          security: segurancaAdmin,
          params: tenantParams,
        },
      },
      async (request, reply) => {
        const dto = await deps.obterMinioTenant.executar(request.params.id);
        return reply.status(200).send(dto);
      },
    );

    // ── Login do administrador de tenant (cliente) ──
    // O email descobre o tenant; o JWT sai com tenantId para as próximas
    // etapas (resolução dinâmica do banco dedicado).
    app.post(
      '/auth/login',
      {
        schema: {
          tags: ['auth'],
          summary: 'Login do administrador de tenant → JWT com tenantId',
          body: loginBody,
        },
      },
      async (request, reply) => {
        const administrador = await deps.autenticarTenantAdministrador.executar(request.body);
        const token = app.jwt.sign(
          {
            sub: administrador.idTenantAdministrador,
            tipo: 'tenant_admin',
            tenantId: administrador.tenantId,
          },
          { expiresIn: VALIDADE_TOKEN },
        );
        return reply.status(200).send({ token, administrador });
      },
    );
  };
}
