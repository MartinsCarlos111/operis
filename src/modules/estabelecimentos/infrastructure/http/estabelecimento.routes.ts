import type { FastifyInstance, preHandlerAsyncHookHandler } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { StatusRecurso } from '@shared/domain/status-recurso.js';
import type { CriarEstabelecimentoUseCase } from '../../application/use-cases/criar-estabelecimento.use-case.js';
import type { CriarNivelAcessoUseCase } from '../../application/use-cases/criar-nivel-acesso.use-case.js';
import type { ListarNiveisAcessoUseCase } from '../../application/use-cases/listar-niveis-acesso.use-case.js';
import type { ListarPermissoesUseCase } from '../../application/use-cases/listar-permissoes.use-case.js';

const statusRecursoSchema = z.nativeEnum(StatusRecurso);

const criarEstabelecimentoBody = z.object({
  descricao: z.string().min(2),
  recursos: z
    .object({
      impressoras: statusRecursoSchema.optional(),
      coletores: statusRecursoSchema.optional(),
      checklist: statusRecursoSchema.optional(),
      manufatura: statusRecursoSchema.optional(),
    })
    .optional(),
});

const criarNivelAcessoBody = z.object({
  nome: z.string().min(2),
  descricao: z.string().optional(),
  permissaoIds: z.array(z.string().uuid()).optional(),
});

/** Use-cases do contexto, montados sobre o PrismaClient de UM tenant. */
export interface EstabelecimentoUseCases {
  criarEstabelecimento: CriarEstabelecimentoUseCase;
  criarNivelAcesso: CriarNivelAcessoUseCase;
  listarNiveisAcesso: ListarNiveisAcessoUseCase;
  listarPermissoes: ListarPermissoesUseCase;
}

export interface EstabelecimentoRoutesDeps {
  /**
   * Fábrica que monta os use-cases sobre o banco do tenant resolvido na
   * request. Chamada por handler — é o que fecha o elo com o Data Plane.
   */
  montarUseCases: (prisma: PrismaClient) => EstabelecimentoUseCases;
  /** Cadeia de autorização injetada pelo composition root (sem import cross-feature). */
  autenticar: preHandlerAsyncHookHandler;
  resolverTenant: preHandlerAsyncHookHandler;
  exigirEstabelecimento: preHandlerAsyncHookHandler;
  autorizar: (...chaves: string[]) => preHandlerAsyncHookHandler;
}

/**
 * Adaptador HTTP do contexto de estabelecimentos. Cada handler monta seus
 * use-cases sobre request.prismaTenant (banco dedicado do tenant), resolvido
 * pelo preHandler resolverTenant. O tenant das rotas de nível/permissão vem do
 * header x-estabelecimento-id (contexto), nunca do body.
 */
export function estabelecimentoRoutes(deps: EstabelecimentoRoutesDeps) {
  // Toda rota de negócio precisa: identidade → banco do tenant → estabelecimento.
  const contexto = [deps.autenticar, deps.resolverTenant, deps.exigirEstabelecimento];
  const seguranca = [{ bearerAuth: [], estabelecimentoHeader: [] }];

  return async function plugin(fastify: FastifyInstance): Promise<void> {
    const app = fastify.withTypeProvider<ZodTypeProvider>();

    app.post(
      '/estabelecimentos',
      {
        preHandler: [deps.autenticar, deps.resolverTenant],
        schema: {
          tags: ['estabelecimentos'],
          summary: 'Cria um estabelecimento no banco do tenant',
          security: [{ bearerAuth: [] }],
          body: criarEstabelecimentoBody,
        },
      },
      async (request, reply) => {
        const { criarEstabelecimento } = deps.montarUseCases(request.prismaTenant);
        const dto = await criarEstabelecimento.executar(request.body);
        return reply.status(201).send(dto);
      },
    );

    // Catálogo para o front montar a seleção de permissões de um nível.
    app.get(
      '/permissoes',
      {
        preHandler: contexto,
        schema: {
          tags: ['rbac'],
          summary: 'Lista o catálogo de permissões',
          security: seguranca,
        },
      },
      async (request, reply) => {
        const { listarPermissoes } = deps.montarUseCases(request.prismaTenant);
        const dtos = await listarPermissoes.executar();
        return reply.status(200).send(dtos);
      },
    );

    app.get(
      '/niveis-acesso',
      {
        preHandler: contexto,
        schema: {
          tags: ['rbac'],
          summary: 'Lista os níveis de acesso do estabelecimento ativo',
          security: seguranca,
        },
      },
      async (request, reply) => {
        const { listarNiveisAcesso } = deps.montarUseCases(request.prismaTenant);
        const dtos = await listarNiveisAcesso.executar(request.estabelecimentoId);
        return reply.status(200).send(dtos);
      },
    );

    app.post(
      '/niveis-acesso',
      {
        preHandler: [...contexto, deps.autorizar('configuracoes:niveis_acesso')],
        schema: {
          tags: ['rbac'],
          summary: 'Cria um nível de acesso no estabelecimento ativo',
          security: seguranca,
          body: criarNivelAcessoBody,
        },
      },
      async (request, reply) => {
        const { criarNivelAcesso } = deps.montarUseCases(request.prismaTenant);
        const dto = await criarNivelAcesso.executar({
          ...request.body,
          estabelecimentoId: request.estabelecimentoId,
        });
        return reply.status(201).send(dto);
      },
    );
  };
}
