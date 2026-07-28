import type { FastifyInstance, preHandlerAsyncHookHandler } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { CriarImpressoraUseCase } from '../../application/use-cases/criar-impressora.use-case.js';
import type { EditarImpressoraUseCase } from '../../application/use-cases/editar-impressora.use-case.js';
import type { ExcluirImpressoraUseCase } from '../../application/use-cases/excluir-impressora.use-case.js';
import type { BuscarImpressoraUseCase } from '../../application/use-cases/buscar-impressora.use-case.js';
import type { ListarImpressorasUseCase } from '../../application/use-cases/listar-impressoras.use-case.js';

/**
 * Query de listagem — paridade com ImpressoraController.GetImpressoras
 * (startIndex, maxRows, jsonConditions). `jsonConditions` (SQL por string) vira
 * `termo` de busca tipado.
 */
const listarImpressorasQuery = z.object({
  startIndex: z.coerce.number().int().min(0).default(0),
  maxRows: z.coerce.number().int().min(1).max(500).default(50),
  termo: z.string().trim().min(1).optional(),
});

const impressoraBody = z.object({
  codigo: z.string().min(1),
  descricao: z.string().min(1),
  endereco: z.string().min(1),
});

const idParam = z.object({ id: z.string().uuid() });

/** Use-cases do contexto, montados sobre o PrismaClient de UM tenant. */
export interface ImpressoraUseCases {
  criarImpressora: CriarImpressoraUseCase;
  editarImpressora: EditarImpressoraUseCase;
  excluirImpressora: ExcluirImpressoraUseCase;
  buscarImpressora: BuscarImpressoraUseCase;
  listarImpressoras: ListarImpressorasUseCase;
}

export interface ImpressoraRoutesDeps {
  montarUseCases: (prisma: PrismaClient) => ImpressoraUseCases;
  autenticar: preHandlerAsyncHookHandler;
  resolverTenant: preHandlerAsyncHookHandler;
  exigirEstabelecimento: preHandlerAsyncHookHandler;
  autorizar: (...chaves: string[]) => preHandlerAsyncHookHandler;
}

/**
 * Adaptador HTTP do contexto de impressoras (migrado de ImpressoraController).
 * Impressora é um recurso GLOBAL do tenant — os dados não são escopados por
 * estabelecimento. Ainda assim o `contexto` completo roda: `exigirEstabelecimento`
 * é o que resolve as permissões do usuário (RBAC por estabelecimento ativo),
 * necessárias para `autorizar('impressoras:*')` — paridade com [Permission].
 */
export function impressoraRoutes(deps: ImpressoraRoutesDeps) {
  const contexto = [deps.autenticar, deps.resolverTenant, deps.exigirEstabelecimento];
  const seguranca = [{ bearerAuth: [], estabelecimentoHeader: [] }];

  return async function plugin(fastify: FastifyInstance): Promise<void> {
    const app = fastify.withTypeProvider<ZodTypeProvider>();

    // GET /impressoras — lista paginada { count, model }.
    app.get(
      '/impressoras',
      {
        preHandler: [...contexto, deps.autorizar('impressoras:list')],
        schema: {
          tags: ['impressoras'],
          summary: 'Lista as impressoras do tenant (paginado)',
          security: seguranca,
          querystring: listarImpressorasQuery,
        },
      },
      async (request, reply) => {
        const { listarImpressoras } = deps.montarUseCases(request.prismaTenant);
        const resultado = await listarImpressoras.executar({
          startIndex: request.query.startIndex,
          maxRows: request.query.maxRows,
          termo: request.query.termo,
        });
        return reply.status(200).send(resultado);
      },
    );

    // GET /impressoras/:id — busca por id (404 se ausente).
    app.get(
      '/impressoras/:id',
      {
        preHandler: [...contexto, deps.autorizar('impressoras:list')],
        schema: {
          tags: ['impressoras'],
          summary: 'Busca uma impressora por id',
          security: seguranca,
          params: idParam,
        },
      },
      async (request, reply) => {
        const { buscarImpressora } = deps.montarUseCases(request.prismaTenant);
        const dto = await buscarImpressora.executar({ idImpressora: request.params.id });
        return reply.status(200).send(dto);
      },
    );

    // POST /impressoras — cria ([Permission IMPRESSORA/Adicionar]).
    app.post(
      '/impressoras',
      {
        preHandler: [...contexto, deps.autorizar('impressoras:create')],
        schema: {
          tags: ['impressoras'],
          summary: 'Cria uma impressora no tenant',
          security: seguranca,
          body: impressoraBody,
        },
      },
      async (request, reply) => {
        const { criarImpressora } = deps.montarUseCases(request.prismaTenant);
        const dto = await criarImpressora.executar(request.body);
        return reply.status(201).send(dto);
      },
    );

    // PUT /impressoras/:id — edita ([Permission IMPRESSORA/Editar]).
    app.put(
      '/impressoras/:id',
      {
        preHandler: [...contexto, deps.autorizar('impressoras:update')],
        schema: {
          tags: ['impressoras'],
          summary: 'Edita uma impressora',
          security: seguranca,
          params: idParam,
          body: impressoraBody,
        },
      },
      async (request, reply) => {
        const { editarImpressora } = deps.montarUseCases(request.prismaTenant);
        const dto = await editarImpressora.executar({
          idImpressora: request.params.id,
          ...request.body,
        });
        return reply.status(200).send(dto);
      },
    );

    // DELETE /impressoras/:id — exclui ([Permission IMPRESSORA/Excluir]).
    app.delete(
      '/impressoras/:id',
      {
        preHandler: [...contexto, deps.autorizar('impressoras:delete')],
        schema: {
          tags: ['impressoras'],
          summary: 'Exclui uma impressora',
          security: seguranca,
          params: idParam,
        },
      },
      async (request, reply) => {
        const { excluirImpressora } = deps.montarUseCases(request.prismaTenant);
        await excluirImpressora.executar({ idImpressora: request.params.id });
        return reply.status(204).send();
      },
    );
  };
}
