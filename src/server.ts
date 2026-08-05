import Fastify, { type FastifyInstance } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import type { PrismaClient } from '@prisma/client';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { registerErrorHandler } from '@shared/http/error-handler.js';
import { registerSwagger } from '@shared/http/swagger.js';
import { resolverTenant } from '@shared/http/resolver-tenant.js';
import { ConnectionManager, PrismaFactoryPadrao } from '@shared/tenant-runtime/index.js';
import { CryptoGeradorId } from '@shared/infra/gateways/crypto-gerador-id.js';
import { construirModuloUsuarios } from '@modules/usuarios/usuarios.module.js';
import { construirModuloEstabelecimentos } from '@modules/estabelecimentos/estabelecimentos.module.js';
import { construirModuloAreas } from '@modules/areas/areas.module.js';
import { construirModuloImpressoras } from '@modules/impressoras/impressoras.module.js';
import { construirModuloNotificacoes } from '@modules/notificacoes/notificacoes.module.js';
import { construirModuloEstabelecimentoImpressoras } from '@modules/estabelecimento_impressoras/estabelecimento-impressoras.module.js';
import { construirModuloAreaUsuarios } from '@modules/area_usuarios/area-usuarios.module.js';
import { construirModuloCrachas } from '@modules/crachas/crachas.module.js';
import { construirModuloLayouts } from '@modules/layouts/layouts.module.js';
import { construirModuloIot } from '@modules/iot/iot.module.js';
import { construirModuloManufatura } from '@modules/manufatura/manufatura.module.js';
import { construirModuloOperisControl } from '@modules/operis_control/operis-control.module.js';

export interface BuildAppOptions {
  prisma: PrismaClient;
  /** Segredo do JWT (HS256). Em produção vem de env; nos testes, fixo. */
  jwtSecret: string;
  /** Chave mestra AES-256-GCM (32 bytes base64) do EncryptionService. */
  chaveMestraCriptografia: string;
  logger?: boolean;
}

/** App + recursos que precisam de shutdown gracioso (ex.: pools de tenant). */
export interface BuiltApp {
  app: FastifyInstance;
  connectionManager: ConnectionManager;
}

/**
 * Monta o app Fastify a partir das dependências. Separado do main.ts para os
 * testes montarem exatamente o mesmo app contra um Prisma descartável.
 *
 * Ordem de wiring:
 *   1. operis_control — dono do Control Plane; expõe o tenantResolver.
 *   2. ConnectionManager — resolve o banco dedicado de cada tenant por request.
 *   3. usuarios/estabelecimentos — módulos de negócio, agora montados sobre o
 *      banco do tenant (request.prismaTenant), não sobre o prisma global.
 *
 * O `prisma` global segue servindo o Control Plane (tenants, super-admins).
 */
export function buildApp({
  prisma,
  jwtSecret,
  chaveMestraCriptografia,
  logger = true,
}: BuildAppOptions): BuiltApp {
  const app = Fastify({ logger });

  // Zod é a fonte de verdade: valida a entrada e serializa as respostas
  // declaradas no `schema` de cada rota. Os mesmos schemas alimentam o OpenAPI.
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.register(fastifyJwt, { secret: jwtSecret });
  registerErrorHandler(app);

  // Swagger antes das rotas para capturá-las. registerSwagger registra os
  // plugins @fastify/swagger e swagger-ui direto no app (ambos são
  // fastify-plugin, quebram encapsulamento) — assim app.swagger() fica no root
  // e a doc enxerga todas as rotas. Disponível em /docs.
  registerSwagger(app);

  app.get('/health', async () => ({ status: 'ok' }));

  const ids = new CryptoGeradorId();

  // 1. Control Plane — usa o banco global e expõe o resolver de tenants.
  const operisControl = construirModuloOperisControl(prisma, ids, { chaveMestraCriptografia });

  // 2. Connection Manager — único a criar/gerenciar PrismaClients de tenant.
  const connectionManager = new ConnectionManager(
    operisControl.tenantResolver,
    new PrismaFactoryPadrao(),
  );
  connectionManager.iniciarSweeper();
  const preResolverTenant = resolverTenant(connectionManager);

  // 3. Módulos de negócio — montam repositórios sobre o banco do tenant.
  const usuarios = construirModuloUsuarios(ids, preResolverTenant);
  const estabelecimentos = construirModuloEstabelecimentos(ids, usuarios.cadeia);
  const areas = construirModuloAreas(ids, usuarios.cadeia);
  const impressoras = construirModuloImpressoras(ids, usuarios.cadeia);
  const notificacoes = construirModuloNotificacoes(ids, usuarios.cadeia);
  const estabelecimentoImpressoras = construirModuloEstabelecimentoImpressoras(usuarios.cadeia);
  const areaUsuarios = construirModuloAreaUsuarios(usuarios.cadeia);
  const crachas = construirModuloCrachas(ids, usuarios.cadeia);
  const layouts = construirModuloLayouts(ids, usuarios.cadeia);
  // O acesso ao broker vem do Control Plane: é aqui, no composition root, que
  // os dois planos se encontram — o módulo iot não importa operis_control.
  const iot = construirModuloIot(ids, usuarios.cadeia, operisControl.resolverAcessoBroker);
  const manufatura = construirModuloManufatura(ids, usuarios.cadeia);

  app.register(usuarios.routes);
  app.register(estabelecimentos.routes);
  app.register(areas.routes);
  app.register(impressoras.routes);
  app.register(notificacoes.routes);
  app.register(estabelecimentoImpressoras.routes);
  app.register(areaUsuarios.routes);
  app.register(crachas.routes);
  app.register(layouts.routes);
  app.register(iot.routes);
  app.register(manufatura.routes);
  app.register(operisControl.routes);

  return { app, connectionManager };
}
