import type { FastifyInstance, preHandlerAsyncHookHandler } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { StatusRecurso } from '@shared/domain/status-recurso.js';
import type { CriarRegraNotificacaoUseCase } from '../../application/use-cases/criar-regra-notificacao.use-case.js';
import type { EditarRegraNotificacaoUseCase } from '../../application/use-cases/editar-regra-notificacao.use-case.js';
import type { ExcluirRegraNotificacaoUseCase } from '../../application/use-cases/excluir-regra-notificacao.use-case.js';
import type { BuscarRegraNotificacaoUseCase } from '../../application/use-cases/buscar-regra-notificacao.use-case.js';
import type { ListarRegrasNotificacaoUseCase } from '../../application/use-cases/listar-regras-notificacao.use-case.js';
import type { CriarCondicaoNotificacaoUseCase } from '../../application/use-cases/criar-condicao-notificacao.use-case.js';
import type { EditarCondicaoNotificacaoUseCase } from '../../application/use-cases/editar-condicao-notificacao.use-case.js';
import type { ExcluirCondicaoNotificacaoUseCase } from '../../application/use-cases/excluir-condicao-notificacao.use-case.js';
import type { ListarCondicoesNotificacaoUseCase } from '../../application/use-cases/listar-condicoes-notificacao.use-case.js';

const statusRecursoSchema = z.nativeEnum(StatusRecurso);

const listarRegrasQuery = z.object({
  startIndex: z.coerce.number().int().min(0).default(0),
  maxRows: z.coerce.number().int().min(1).max(500).default(50),
  termo: z.string().trim().min(1).optional(),
});

const regraBody = z.object({
  codigo: z.string().min(1),
  descricao: z.string().min(1),
  tabela: z.string().min(1),
  conteudo: z.string().min(1),
  destinatarios: z.string().optional(),
  produto: z.string().optional(),
  status: statusRecursoSchema.optional(),
});

const condicaoBody = z.object({
  campo: z.string().min(1),
  operador: z.string().min(1),
  valor: z.string().optional(),
});

const idParam = z.object({ id: z.string().uuid() });
const idRegraParam = z.object({ idRegra: z.string().uuid() });

/** Use-cases do contexto, montados sobre o PrismaClient de UM tenant. */
export interface NotificacaoUseCases {
  criarRegra: CriarRegraNotificacaoUseCase;
  editarRegra: EditarRegraNotificacaoUseCase;
  excluirRegra: ExcluirRegraNotificacaoUseCase;
  buscarRegra: BuscarRegraNotificacaoUseCase;
  listarRegras: ListarRegrasNotificacaoUseCase;
  criarCondicao: CriarCondicaoNotificacaoUseCase;
  editarCondicao: EditarCondicaoNotificacaoUseCase;
  excluirCondicao: ExcluirCondicaoNotificacaoUseCase;
  listarCondicoes: ListarCondicoesNotificacaoUseCase;
}

export interface NotificacaoRoutesDeps {
  montarUseCases: (prisma: PrismaClient) => NotificacaoUseCases;
  autenticar: preHandlerAsyncHookHandler;
  resolverTenant: preHandlerAsyncHookHandler;
  exigirEstabelecimento: preHandlerAsyncHookHandler;
  autorizar: (...chaves: string[]) => preHandlerAsyncHookHandler;
}

/**
 * Adaptador HTTP do contexto de notificações (migrado de RegraNotificacao-
 * Controller + CondicaoNotificacaoController). Cobre o CADASTRO: regra + suas
 * condições (1:N). O motor de disparo e o realtime ficam fora deste módulo.
 * As condições são geridas aninhadas à regra (`/regras-notificacao/:idRegra/
 * condicoes`) e por id direto para editar/excluir.
 */
export function notificacaoRoutes(deps: NotificacaoRoutesDeps) {
  const contexto = [deps.autenticar, deps.resolverTenant, deps.exigirEstabelecimento];
  const seguranca = [{ bearerAuth: [], estabelecimentoHeader: [] }];

  return async function plugin(fastify: FastifyInstance): Promise<void> {
    const app = fastify.withTypeProvider<ZodTypeProvider>();

    // ─── Regras de notificação ───────────────────────────────────────────────
    app.get(
      '/regras-notificacao',
      {
        preHandler: [...contexto, deps.autorizar('notificacoes:list')],
        schema: {
          tags: ['notificacoes'],
          summary: 'Lista as regras de notificação (paginado)',
          security: seguranca,
          querystring: listarRegrasQuery,
        },
      },
      async (request, reply) => {
        const { listarRegras } = deps.montarUseCases(request.prismaTenant);
        const resultado = await listarRegras.executar({
          startIndex: request.query.startIndex,
          maxRows: request.query.maxRows,
          termo: request.query.termo,
        });
        return reply.status(200).send(resultado);
      },
    );

    app.get(
      '/regras-notificacao/:id',
      {
        preHandler: [...contexto, deps.autorizar('notificacoes:list')],
        schema: {
          tags: ['notificacoes'],
          summary: 'Busca uma regra de notificação por id',
          security: seguranca,
          params: idParam,
        },
      },
      async (request, reply) => {
        const { buscarRegra } = deps.montarUseCases(request.prismaTenant);
        const dto = await buscarRegra.executar({ idRegraNotificacao: request.params.id });
        return reply.status(200).send(dto);
      },
    );

    app.post(
      '/regras-notificacao',
      {
        preHandler: [...contexto, deps.autorizar('notificacoes:create')],
        schema: {
          tags: ['notificacoes'],
          summary: 'Cria uma regra de notificação',
          security: seguranca,
          body: regraBody,
        },
      },
      async (request, reply) => {
        const { criarRegra } = deps.montarUseCases(request.prismaTenant);
        const dto = await criarRegra.executar(request.body);
        return reply.status(201).send(dto);
      },
    );

    app.put(
      '/regras-notificacao/:id',
      {
        preHandler: [...contexto, deps.autorizar('notificacoes:update')],
        schema: {
          tags: ['notificacoes'],
          summary: 'Edita uma regra de notificação',
          security: seguranca,
          params: idParam,
          body: regraBody,
        },
      },
      async (request, reply) => {
        const { editarRegra } = deps.montarUseCases(request.prismaTenant);
        const dto = await editarRegra.executar({
          idRegraNotificacao: request.params.id,
          ...request.body,
        });
        return reply.status(200).send(dto);
      },
    );

    app.delete(
      '/regras-notificacao/:id',
      {
        preHandler: [...contexto, deps.autorizar('notificacoes:delete')],
        schema: {
          tags: ['notificacoes'],
          summary: 'Exclui uma regra de notificação (e suas condições)',
          security: seguranca,
          params: idParam,
        },
      },
      async (request, reply) => {
        const { excluirRegra } = deps.montarUseCases(request.prismaTenant);
        await excluirRegra.executar({ idRegraNotificacao: request.params.id });
        return reply.status(204).send();
      },
    );

    // ─── Condições de uma regra (1:N) ────────────────────────────────────────
    app.get(
      '/regras-notificacao/:idRegra/condicoes',
      {
        preHandler: [...contexto, deps.autorizar('notificacoes:list')],
        schema: {
          tags: ['notificacoes'],
          summary: 'Lista as condições de uma regra',
          security: seguranca,
          params: idRegraParam,
        },
      },
      async (request, reply) => {
        const { listarCondicoes } = deps.montarUseCases(request.prismaTenant);
        const resultado = await listarCondicoes.executar({
          idRegraNotificacao: request.params.idRegra,
        });
        return reply.status(200).send(resultado);
      },
    );

    app.post(
      '/regras-notificacao/:idRegra/condicoes',
      {
        preHandler: [...contexto, deps.autorizar('notificacoes:update')],
        schema: {
          tags: ['notificacoes'],
          summary: 'Adiciona uma condição a uma regra',
          security: seguranca,
          params: idRegraParam,
          body: condicaoBody,
        },
      },
      async (request, reply) => {
        const { criarCondicao } = deps.montarUseCases(request.prismaTenant);
        const dto = await criarCondicao.executar({
          idRegraNotificacao: request.params.idRegra,
          ...request.body,
        });
        return reply.status(201).send(dto);
      },
    );

    app.put(
      '/condicoes-notificacao/:id',
      {
        preHandler: [...contexto, deps.autorizar('notificacoes:update')],
        schema: {
          tags: ['notificacoes'],
          summary: 'Edita uma condição de notificação',
          security: seguranca,
          params: idParam,
          body: condicaoBody,
        },
      },
      async (request, reply) => {
        const { editarCondicao } = deps.montarUseCases(request.prismaTenant);
        const dto = await editarCondicao.executar({
          idCondicaoNotificacao: request.params.id,
          ...request.body,
        });
        return reply.status(200).send(dto);
      },
    );

    app.delete(
      '/condicoes-notificacao/:id',
      {
        preHandler: [...contexto, deps.autorizar('notificacoes:update')],
        schema: {
          tags: ['notificacoes'],
          summary: 'Exclui uma condição de notificação',
          security: seguranca,
          params: idParam,
        },
      },
      async (request, reply) => {
        const { excluirCondicao } = deps.montarUseCases(request.prismaTenant);
        await excluirCondicao.executar({ idCondicaoNotificacao: request.params.id });
        return reply.status(204).send();
      },
    );
  };
}
