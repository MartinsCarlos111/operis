import type { FastifyInstance, preHandlerAsyncHookHandler } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { CriarVariavelLayoutUseCase } from '../../application/use-cases/criar-variavel-layout.use-case.js';
import type { EditarVariavelLayoutUseCase } from '../../application/use-cases/editar-variavel-layout.use-case.js';
import type { ExcluirVariavelLayoutUseCase } from '../../application/use-cases/excluir-variavel-layout.use-case.js';
import type { BuscarVariavelLayoutUseCase } from '../../application/use-cases/buscar-variavel-layout.use-case.js';
import type { ListarVariaveisLayoutUseCase } from '../../application/use-cases/listar-variaveis-layout.use-case.js';
import type { CriarLayoutEtiquetaUseCase } from '../../application/use-cases/criar-layout-etiqueta.use-case.js';
import type { EditarLayoutEtiquetaUseCase } from '../../application/use-cases/editar-layout-etiqueta.use-case.js';
import type { ExcluirLayoutEtiquetaUseCase } from '../../application/use-cases/excluir-layout-etiqueta.use-case.js';
import type { BuscarLayoutEtiquetaUseCase } from '../../application/use-cases/buscar-layout-etiqueta.use-case.js';
import type { ListarLayoutsEtiquetaUseCase } from '../../application/use-cases/listar-layouts-etiqueta.use-case.js';

const listagemQuery = z.object({
  startIndex: z.coerce.number().int().min(0).default(0),
  maxRows: z.coerce.number().int().min(1).max(500).default(50),
  termo: z.string().trim().min(1).optional(),
});

const variavelBody = z.object({
  codigo: z.string().min(1),
  descricao: z.string().min(1),
  campoEtiquetaManufatura: z.string().optional(),
  campoEtiquetaColetores: z.string().optional(),
});

const layoutBody = z.object({
  codigo: z.string().min(1),
  descricao: z.string().min(1),
  zpl: z.string().optional(),
});

const idParam = z.object({ id: z.string().uuid() });

export interface LayoutUseCases {
  criarVariavel: CriarVariavelLayoutUseCase;
  editarVariavel: EditarVariavelLayoutUseCase;
  excluirVariavel: ExcluirVariavelLayoutUseCase;
  buscarVariavel: BuscarVariavelLayoutUseCase;
  listarVariaveis: ListarVariaveisLayoutUseCase;
  criarLayout: CriarLayoutEtiquetaUseCase;
  editarLayout: EditarLayoutEtiquetaUseCase;
  excluirLayout: ExcluirLayoutEtiquetaUseCase;
  buscarLayout: BuscarLayoutEtiquetaUseCase;
  listarLayouts: ListarLayoutsEtiquetaUseCase;
}

export interface LayoutRoutesDeps {
  montarUseCases: (prisma: PrismaClient) => LayoutUseCases;
  autenticar: preHandlerAsyncHookHandler;
  resolverTenant: preHandlerAsyncHookHandler;
  exigirEstabelecimento: preHandlerAsyncHookHandler;
  autorizar: (...chaves: string[]) => preHandlerAsyncHookHandler;
}

/**
 * Adaptador HTTP de layouts de etiqueta (migrado de VariavelLayoutController +
 * LayoutEtiquetaController). Dois recursos globais do tenant: variáveis de
 * layout e layouts (templates ZPL). Ambos sob o grupo de permissão `layouts`.
 */
export function layoutRoutes(deps: LayoutRoutesDeps) {
  const contexto = [deps.autenticar, deps.resolverTenant, deps.exigirEstabelecimento];
  const seguranca = [{ bearerAuth: [], estabelecimentoHeader: [] }];

  return async function plugin(fastify: FastifyInstance): Promise<void> {
    const app = fastify.withTypeProvider<ZodTypeProvider>();

    // ─── Variáveis de layout ─────────────────────────────────────────────────
    app.get(
      '/variaveis-layout',
      {
        preHandler: [...contexto, deps.autorizar('layouts:list')],
        schema: {
          tags: ['layouts'],
          summary: 'Lista as variáveis de layout (paginado)',
          security: seguranca,
          querystring: listagemQuery,
        },
      },
      async (request, reply) => {
        const { listarVariaveis } = deps.montarUseCases(request.prismaTenant);
        return reply.status(200).send(await listarVariaveis.executar(request.query));
      },
    );

    app.get(
      '/variaveis-layout/:id',
      {
        preHandler: [...contexto, deps.autorizar('layouts:list')],
        schema: {
          tags: ['layouts'],
          summary: 'Busca uma variável de layout por id',
          security: seguranca,
          params: idParam,
        },
      },
      async (request, reply) => {
        const { buscarVariavel } = deps.montarUseCases(request.prismaTenant);
        return reply.status(200).send(await buscarVariavel.executar({ idVariavel: request.params.id }));
      },
    );

    app.post(
      '/variaveis-layout',
      {
        preHandler: [...contexto, deps.autorizar('layouts:create')],
        schema: {
          tags: ['layouts'],
          summary: 'Cria uma variável de layout',
          security: seguranca,
          body: variavelBody,
        },
      },
      async (request, reply) => {
        const { criarVariavel } = deps.montarUseCases(request.prismaTenant);
        return reply.status(201).send(await criarVariavel.executar(request.body));
      },
    );

    app.put(
      '/variaveis-layout/:id',
      {
        preHandler: [...contexto, deps.autorizar('layouts:update')],
        schema: {
          tags: ['layouts'],
          summary: 'Edita uma variável de layout',
          security: seguranca,
          params: idParam,
          body: variavelBody,
        },
      },
      async (request, reply) => {
        const { editarVariavel } = deps.montarUseCases(request.prismaTenant);
        return reply
          .status(200)
          .send(await editarVariavel.executar({ idVariavel: request.params.id, ...request.body }));
      },
    );

    app.delete(
      '/variaveis-layout/:id',
      {
        preHandler: [...contexto, deps.autorizar('layouts:delete')],
        schema: {
          tags: ['layouts'],
          summary: 'Exclui uma variável de layout',
          security: seguranca,
          params: idParam,
        },
      },
      async (request, reply) => {
        const { excluirVariavel } = deps.montarUseCases(request.prismaTenant);
        await excluirVariavel.executar({ idVariavel: request.params.id });
        return reply.status(204).send();
      },
    );

    // ─── Layouts de etiqueta (ZPL) ───────────────────────────────────────────
    app.get(
      '/layouts-etiqueta',
      {
        preHandler: [...contexto, deps.autorizar('layouts:list')],
        schema: {
          tags: ['layouts'],
          summary: 'Lista os layouts de etiqueta (paginado)',
          security: seguranca,
          querystring: listagemQuery,
        },
      },
      async (request, reply) => {
        const { listarLayouts } = deps.montarUseCases(request.prismaTenant);
        return reply.status(200).send(await listarLayouts.executar(request.query));
      },
    );

    app.get(
      '/layouts-etiqueta/:id',
      {
        preHandler: [...contexto, deps.autorizar('layouts:list')],
        schema: {
          tags: ['layouts'],
          summary: 'Busca um layout de etiqueta por id',
          security: seguranca,
          params: idParam,
        },
      },
      async (request, reply) => {
        const { buscarLayout } = deps.montarUseCases(request.prismaTenant);
        return reply.status(200).send(await buscarLayout.executar({ idLayout: request.params.id }));
      },
    );

    app.post(
      '/layouts-etiqueta',
      {
        preHandler: [...contexto, deps.autorizar('layouts:create')],
        schema: {
          tags: ['layouts'],
          summary: 'Cria um layout de etiqueta',
          security: seguranca,
          body: layoutBody,
        },
      },
      async (request, reply) => {
        const { criarLayout } = deps.montarUseCases(request.prismaTenant);
        return reply.status(201).send(await criarLayout.executar(request.body));
      },
    );

    app.put(
      '/layouts-etiqueta/:id',
      {
        preHandler: [...contexto, deps.autorizar('layouts:update')],
        schema: {
          tags: ['layouts'],
          summary: 'Edita um layout de etiqueta',
          security: seguranca,
          params: idParam,
          body: layoutBody,
        },
      },
      async (request, reply) => {
        const { editarLayout } = deps.montarUseCases(request.prismaTenant);
        return reply
          .status(200)
          .send(await editarLayout.executar({ idLayout: request.params.id, ...request.body }));
      },
    );

    app.delete(
      '/layouts-etiqueta/:id',
      {
        preHandler: [...contexto, deps.autorizar('layouts:delete')],
        schema: {
          tags: ['layouts'],
          summary: 'Exclui um layout de etiqueta',
          security: seguranca,
          params: idParam,
        },
      },
      async (request, reply) => {
        const { excluirLayout } = deps.montarUseCases(request.prismaTenant);
        await excluirLayout.executar({ idLayout: request.params.id });
        return reply.status(204).send();
      },
    );
  };
}
