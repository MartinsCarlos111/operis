import type { FastifyInstance, preHandlerAsyncHookHandler } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { CriarAreaUseCase } from '../../application/use-cases/criar-area.use-case.js';
import type { EditarAreaUseCase } from '../../application/use-cases/editar-area.use-case.js';
import type { ExcluirAreaUseCase } from '../../application/use-cases/excluir-area.use-case.js';
import type { BuscarAreaUseCase } from '../../application/use-cases/buscar-area.use-case.js';
import type { ListarAreasUseCase } from '../../application/use-cases/listar-areas.use-case.js';

/**
 * Query de listagem — paridade com AreaController.GetAreas(startIndex, maxRows,
 * jsonConditions). `jsonConditions` (SQL montado por string no legado) vira um
 * `termo` de busca tipado. Defaults conservadores para paginação.
 */
const listarAreasQuery = z.object({
  startIndex: z.coerce.number().int().min(0).default(0),
  maxRows: z.coerce.number().int().min(1).max(500).default(50),
  termo: z.string().trim().min(1).optional(),
});

const areaBody = z.object({
  codigo: z.string().min(1),
  descricao: z.string().min(1),
});

const idParam = z.object({ id: z.string().uuid() });

/** Use-cases do contexto, montados sobre o PrismaClient de UM tenant. */
export interface AreaUseCases {
  criarArea: CriarAreaUseCase;
  editarArea: EditarAreaUseCase;
  excluirArea: ExcluirAreaUseCase;
  buscarArea: BuscarAreaUseCase;
  listarAreas: ListarAreasUseCase;
}

export interface AreaRoutesDeps {
  montarUseCases: (prisma: PrismaClient) => AreaUseCases;
  autenticar: preHandlerAsyncHookHandler;
  resolverTenant: preHandlerAsyncHookHandler;
  exigirEstabelecimento: preHandlerAsyncHookHandler;
  autorizar: (...chaves: string[]) => preHandlerAsyncHookHandler;
}

/**
 * Adaptador HTTP do contexto de áreas (migrado de AreaController). Toda rota
 * roda no estabelecimento ativo (header x-estabelecimento-id); as mutações
 * exigem a permissão correspondente — paridade com [Permission("AREA/...")].
 */
export function areaRoutes(deps: AreaRoutesDeps) {
  const contexto = [deps.autenticar, deps.resolverTenant, deps.exigirEstabelecimento];
  const seguranca = [{ bearerAuth: [], estabelecimentoHeader: [] }];

  return async function plugin(fastify: FastifyInstance): Promise<void> {
    const app = fastify.withTypeProvider<ZodTypeProvider>();

    // GET /areas — lista paginada { count, model } (= AreaController.GetAreas).
    app.get(
      '/areas',
      {
        preHandler: [...contexto, deps.autorizar('areas:list')],
        schema: {
          tags: ['areas'],
          summary: 'Lista as áreas do estabelecimento ativo (paginado)',
          security: seguranca,
          querystring: listarAreasQuery,
        },
      },
      async (request, reply) => {
        const { listarAreas } = deps.montarUseCases(request.prismaTenant);
        const resultado = await listarAreas.executar({
          estabelecimentoId: request.estabelecimentoId,
          startIndex: request.query.startIndex,
          maxRows: request.query.maxRows,
          termo: request.query.termo,
        });
        return reply.status(200).send(resultado);
      },
    );

    // GET /areas/:id — busca por id (= AreaController.GetArea, 404 se ausente).
    app.get(
      '/areas/:id',
      {
        preHandler: [...contexto, deps.autorizar('areas:list')],
        schema: {
          tags: ['areas'],
          summary: 'Busca uma área por id',
          security: seguranca,
          params: idParam,
        },
      },
      async (request, reply) => {
        const { buscarArea } = deps.montarUseCases(request.prismaTenant);
        const dto = await buscarArea.executar({
          idArea: request.params.id,
          estabelecimentoId: request.estabelecimentoId,
        });
        return reply.status(200).send(dto);
      },
    );

    // POST /areas — cria (= AreaController.PostArea, [Permission AREA/Adicionar]).
    app.post(
      '/areas',
      {
        preHandler: [...contexto, deps.autorizar('areas:create')],
        schema: {
          tags: ['areas'],
          summary: 'Cria uma área no estabelecimento ativo',
          security: seguranca,
          body: areaBody,
        },
      },
      async (request, reply) => {
        const { criarArea } = deps.montarUseCases(request.prismaTenant);
        const dto = await criarArea.executar({
          estabelecimentoId: request.estabelecimentoId,
          codigo: request.body.codigo,
          descricao: request.body.descricao,
        });
        return reply.status(201).send(dto);
      },
    );

    // PUT /areas/:id — edita (= AreaController.PutArea, [Permission AREA/Editar]).
    app.put(
      '/areas/:id',
      {
        preHandler: [...contexto, deps.autorizar('areas:update')],
        schema: {
          tags: ['areas'],
          summary: 'Edita uma área',
          security: seguranca,
          params: idParam,
          body: areaBody,
        },
      },
      async (request, reply) => {
        const { editarArea } = deps.montarUseCases(request.prismaTenant);
        const dto = await editarArea.executar({
          idArea: request.params.id,
          estabelecimentoId: request.estabelecimentoId,
          codigo: request.body.codigo,
          descricao: request.body.descricao,
        });
        return reply.status(200).send(dto);
      },
    );

    // DELETE /areas/:id — exclui (= AreaController.DeleteArea, AREA/Excluir).
    app.delete(
      '/areas/:id',
      {
        preHandler: [...contexto, deps.autorizar('areas:delete')],
        schema: {
          tags: ['areas'],
          summary: 'Exclui uma área (bloqueada se houver usuários vinculados)',
          security: seguranca,
          params: idParam,
        },
      },
      async (request, reply) => {
        const { excluirArea } = deps.montarUseCases(request.prismaTenant);
        await excluirArea.executar({
          idArea: request.params.id,
          estabelecimentoId: request.estabelecimentoId,
        });
        return reply.status(204).send();
      },
    );
  };
}
