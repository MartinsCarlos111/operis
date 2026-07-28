import type { FastifyInstance, preHandlerAsyncHookHandler } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { StatusRecurso } from '@shared/domain/status-recurso.js';
import type { CriarCrachaUseCase } from '../../application/use-cases/criar-cracha.use-case.js';
import type { EditarCrachaUseCase } from '../../application/use-cases/editar-cracha.use-case.js';
import type { ExcluirCrachaUseCase } from '../../application/use-cases/excluir-cracha.use-case.js';
import type { BuscarCrachaUseCase } from '../../application/use-cases/buscar-cracha.use-case.js';
import type { ListarCrachasUseCase } from '../../application/use-cases/listar-crachas.use-case.js';

const statusRecursoSchema = z.nativeEnum(StatusRecurso);

const listarCrachasQuery = z.object({
  startIndex: z.coerce.number().int().min(0).default(0),
  maxRows: z.coerce.number().int().min(1).max(500).default(50),
  termo: z.string().trim().min(1).optional(),
});

const crachaBody = z.object({
  codigo: z.string().min(1),
  nome: z.string().min(1),
  status: statusRecursoSchema.optional(),
});

const idParam = z.object({ id: z.string().uuid() });

/** Use-cases do contexto, montados sobre o PrismaClient de UM tenant. */
export interface CrachaUseCases {
  criarCracha: CriarCrachaUseCase;
  editarCracha: EditarCrachaUseCase;
  excluirCracha: ExcluirCrachaUseCase;
  buscarCracha: BuscarCrachaUseCase;
  listarCrachas: ListarCrachasUseCase;
}

export interface CrachaRoutesDeps {
  montarUseCases: (prisma: PrismaClient) => CrachaUseCases;
  autenticar: preHandlerAsyncHookHandler;
  resolverTenant: preHandlerAsyncHookHandler;
  exigirEstabelecimento: preHandlerAsyncHookHandler;
  autorizar: (...chaves: string[]) => preHandlerAsyncHookHandler;
}

/**
 * Adaptador HTTP do contexto de crachás (migrado de CrachaController). Crachá é
 * global do tenant. As digitais (biometria) são um agregado à parte, gerido
 * pelo operis-bio-bridge — fora deste CRUD.
 */
export function crachaRoutes(deps: CrachaRoutesDeps) {
  const contexto = [deps.autenticar, deps.resolverTenant, deps.exigirEstabelecimento];
  const seguranca = [{ bearerAuth: [], estabelecimentoHeader: [] }];

  return async function plugin(fastify: FastifyInstance): Promise<void> {
    const app = fastify.withTypeProvider<ZodTypeProvider>();

    app.get(
      '/crachas',
      {
        preHandler: [...contexto, deps.autorizar('crachas:list')],
        schema: {
          tags: ['crachas'],
          summary: 'Lista os crachás do tenant (paginado)',
          security: seguranca,
          querystring: listarCrachasQuery,
        },
      },
      async (request, reply) => {
        const { listarCrachas } = deps.montarUseCases(request.prismaTenant);
        const resultado = await listarCrachas.executar({
          startIndex: request.query.startIndex,
          maxRows: request.query.maxRows,
          termo: request.query.termo,
        });
        return reply.status(200).send(resultado);
      },
    );

    app.get(
      '/crachas/:id',
      {
        preHandler: [...contexto, deps.autorizar('crachas:list')],
        schema: {
          tags: ['crachas'],
          summary: 'Busca um crachá por id',
          security: seguranca,
          params: idParam,
        },
      },
      async (request, reply) => {
        const { buscarCracha } = deps.montarUseCases(request.prismaTenant);
        const dto = await buscarCracha.executar({ idCracha: request.params.id });
        return reply.status(200).send(dto);
      },
    );

    app.post(
      '/crachas',
      {
        preHandler: [...contexto, deps.autorizar('crachas:create')],
        schema: {
          tags: ['crachas'],
          summary: 'Cria um crachá',
          security: seguranca,
          body: crachaBody,
        },
      },
      async (request, reply) => {
        const { criarCracha } = deps.montarUseCases(request.prismaTenant);
        const dto = await criarCracha.executar(request.body);
        return reply.status(201).send(dto);
      },
    );

    app.put(
      '/crachas/:id',
      {
        preHandler: [...contexto, deps.autorizar('crachas:update')],
        schema: {
          tags: ['crachas'],
          summary: 'Edita um crachá',
          security: seguranca,
          params: idParam,
          body: crachaBody,
        },
      },
      async (request, reply) => {
        const { editarCracha } = deps.montarUseCases(request.prismaTenant);
        const dto = await editarCracha.executar({ idCracha: request.params.id, ...request.body });
        return reply.status(200).send(dto);
      },
    );

    app.delete(
      '/crachas/:id',
      {
        preHandler: [...contexto, deps.autorizar('crachas:delete')],
        schema: {
          tags: ['crachas'],
          summary: 'Exclui um crachá (e suas digitais)',
          security: seguranca,
          params: idParam,
        },
      },
      async (request, reply) => {
        const { excluirCracha } = deps.montarUseCases(request.prismaTenant);
        await excluirCracha.executar({ idCracha: request.params.id });
        return reply.status(204).send();
      },
    );
  };
}
