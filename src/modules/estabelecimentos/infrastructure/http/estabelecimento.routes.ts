import type { FastifyInstance, preHandlerAsyncHookHandler } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { StatusRecurso } from '@shared/domain/status-recurso.js';
import type { CriarEstabelecimentoUseCase } from '../../application/use-cases/criar-estabelecimento.use-case.js';
import type { ListarEstabelecimentosUseCase } from '../../application/use-cases/listar-estabelecimentos.use-case.js';
import type { BuscarEstabelecimentoUseCase } from '../../application/use-cases/buscar-estabelecimento.use-case.js';
import type { EditarEstabelecimentoUseCase } from '../../application/use-cases/editar-estabelecimento.use-case.js';
import type { InativarEstabelecimentoUseCase } from '../../application/use-cases/inativar-estabelecimento.use-case.js';
import type { CriarNivelAcessoUseCase } from '../../application/use-cases/criar-nivel-acesso.use-case.js';
import type { ListarNiveisAcessoUseCase } from '../../application/use-cases/listar-niveis-acesso.use-case.js';
import type { ListarPermissoesUseCase } from '../../application/use-cases/listar-permissoes.use-case.js';

const statusRecursoSchema = z.nativeEnum(StatusRecurso);

const recursosSchema = z.object({
  impressoras: statusRecursoSchema.optional(),
  coletores: statusRecursoSchema.optional(),
  checklist: statusRecursoSchema.optional(),
  manufatura: statusRecursoSchema.optional(),
});

const criarEstabelecimentoBody = z.object({
  descricao: z.string().min(2),
  recursos: recursosSchema.optional(),
});

// PUT descreve o estado final: `recursos` omitido desliga todos os módulos.
// `status` é opcional — omitido preserva o status atual.
const editarEstabelecimentoBody = z.object({
  descricao: z.string().min(2),
  recursos: recursosSchema.optional(),
  status: statusRecursoSchema.optional(),
});

const idParam = z.object({ id: z.string().uuid() });

const criarNivelAcessoBody = z.object({
  nome: z.string().min(2),
  descricao: z.string().optional(),
  permissaoIds: z.array(z.string().uuid()).optional(),
});

/** Use-cases do contexto, montados sobre o PrismaClient de UM tenant. */
export interface EstabelecimentoUseCases {
  criarEstabelecimento: CriarEstabelecimentoUseCase;
  listarEstabelecimentos: ListarEstabelecimentosUseCase;
  buscarEstabelecimento: BuscarEstabelecimentoUseCase;
  editarEstabelecimento: EditarEstabelecimentoUseCase;
  inativarEstabelecimento: InativarEstabelecimentoUseCase;
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
        const dto = await criarEstabelecimento.executar({ ...request.body, usuarioId: request.usuarioId });
        return reply.status(201).send(dto);
      },
    );

    // Lista os estabelecimentos do tenant. NÃO exige x-estabelecimento-id: é a
    // rota que alimenta a tela de seleção (resolve o ovo-e-galinha — o usuário
    // ainda não escolheu um estabelecimento).
    app.get(
      '/estabelecimentos',
      {
        preHandler: [deps.autenticar, deps.resolverTenant],
        schema: {
          tags: ['estabelecimentos'],
          summary: 'Lista os estabelecimentos do tenant (para a seleção)',
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        const { listarEstabelecimentos } = deps.montarUseCases(request.prismaTenant);
        const dtos = await listarEstabelecimentos.executar();
        return reply.status(200).send(dtos);
      },
    );

    // Mesma cadeia do GET da lista: quem enxerga a lista enxerga o item.
    app.get(
      '/estabelecimentos/:id',
      {
        preHandler: [deps.autenticar, deps.resolverTenant],
        schema: {
          tags: ['estabelecimentos'],
          summary: 'Busca um estabelecimento do tenant por id',
          security: [{ bearerAuth: [] }],
          params: idParam,
        },
      },
      async (request, reply) => {
        const { buscarEstabelecimento } = deps.montarUseCases(request.prismaTenant);
        const dto = await buscarEstabelecimento.executar(request.params.id);
        return reply.status(200).send(dto);
      },
    );

    // As mutações usam a cadeia completa: o RBAC vive no vínculo do usuário com
    // o estabelecimento ATIVO (header), que não é necessariamente o :id editado.
    app.put(
      '/estabelecimentos/:id',
      {
        preHandler: [...contexto, deps.autorizar('principal:update')],
        schema: {
          tags: ['estabelecimentos'],
          summary: 'Edita um estabelecimento (descrição, módulos e status)',
          security: seguranca,
          params: idParam,
          body: editarEstabelecimentoBody,
        },
      },
      async (request, reply) => {
        const { editarEstabelecimento } = deps.montarUseCases(request.prismaTenant);
        const dto = await editarEstabelecimento.executar({
          idEstabelecimento: request.params.id,
          descricao: request.body.descricao,
          recursos: request.body.recursos,
          status: request.body.status,
        });
        return reply.status(200).send(dto);
      },
    );

    // DELETE inativa (soft delete) — as relações do schema são onDelete:
    // Cascade, exclusão física levaria áreas, vínculos e coletores junto.
    // Reversível via PUT com status ATIVO.
    app.delete(
      '/estabelecimentos/:id',
      {
        preHandler: [...contexto, deps.autorizar('principal:delete')],
        schema: {
          tags: ['estabelecimentos'],
          summary: 'Inativa um estabelecimento (não exclui fisicamente)',
          security: seguranca,
          params: idParam,
        },
      },
      async (request, reply) => {
        const { inativarEstabelecimento } = deps.montarUseCases(request.prismaTenant);
        await inativarEstabelecimento.executar(request.params.id);
        return reply.status(204).send();
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
