import type { FastifyInstance } from 'fastify';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { jsonSchemaTransform } from 'fastify-type-provider-zod';

/**
 * Documentação OpenAPI + Swagger UI. A doc é gerada a partir dos MESMOS
 * schemas Zod que validam as rotas (via jsonSchemaTransform) — uma verdade só:
 * o que valida é o que documenta.
 *
 * Dois esquemas de segurança expostos no botão "Authorize":
 *   - bearerAuth: o JWT (Authorization: Bearer <token>), usado por todas as
 *     rotas autenticadas (negócio e /admin).
 *   - estabelecimentoHeader: o header x-estabelecimento-id, exigido pelas
 *     rotas de negócio que operam no contexto de um estabelecimento.
 *
 * Deve ser chamado ANTES das rotas para capturá-las. Os dois app.register são
 * apenas enfileirados aqui (o Fastify os resolve no ready()), então não é
 * preciso await: chamar de forma síncrona preserva a ordem swagger → ui → rotas.
 */
export function registerSwagger(app: FastifyInstance): void {
  app.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Operis API',
        description:
          'API do Operis. Rotas de negócio (usuários, estabelecimentos, RBAC) e ' +
          'Control Plane (/admin) para administração de tenants. ' +
          'Autentique-se em /auth/login (admin de tenant) ou /admin/auth/login (super-admin), ' +
          'clique em Authorize e cole o token.',
        version: '0.1.0',
      },
      tags: [
        { name: 'auth', description: 'Autenticação (login e emissão de JWT)' },
        { name: 'usuarios', description: 'Gestão de usuários' },
        { name: 'estabelecimentos', description: 'Estabelecimentos e recursos' },
        { name: 'rbac', description: 'Níveis de acesso e permissões' },
        { name: 'admin', description: 'Control Plane — exclusivo de super-admins' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT obtido no login. Formato: Bearer <token>.',
          },
          estabelecimentoHeader: {
            type: 'apiKey',
            in: 'header',
            name: 'x-estabelecimento-id',
            description: 'UUID do estabelecimento ativo, exigido pelas rotas de contexto.',
          },
        },
      },
    },
    transform: jsonSchemaTransform,
  });

  app.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list', deepLinking: true },
  });
}
