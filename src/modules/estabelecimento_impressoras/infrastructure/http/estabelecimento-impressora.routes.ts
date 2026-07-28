import type { FastifyInstance, preHandlerAsyncHookHandler } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { VincularImpressoraUseCase } from '../../application/use-cases/vincular-impressora.use-case.js';
import type { DesvincularImpressoraUseCase } from '../../application/use-cases/desvincular-impressora.use-case.js';
import type { ListarPorEstabelecimentoUseCase } from '../../application/use-cases/listar-por-estabelecimento.use-case.js';
import type { ListarPorImpressoraUseCase } from '../../application/use-cases/listar-por-impressora.use-case.js';

const vincularBody = z.object({
  idEstabelecimento: z.string().uuid(),
  idImpressora: z.string().uuid(),
});

const parParams = z.object({
  idEstabelecimento: z.string().uuid(),
  idImpressora: z.string().uuid(),
});
const idEstabelecimentoParam = z.object({ idEstabelecimento: z.string().uuid() });
const idImpressoraParam = z.object({ idImpressora: z.string().uuid() });

/** Use-cases do contexto, montados sobre o PrismaClient de UM tenant. */
export interface EstabelecimentoImpressoraUseCases {
  vincular: VincularImpressoraUseCase;
  desvincular: DesvincularImpressoraUseCase;
  listarPorEstabelecimento: ListarPorEstabelecimentoUseCase;
  listarPorImpressora: ListarPorImpressoraUseCase;
}

export interface EstabelecimentoImpressoraRoutesDeps {
  montarUseCases: (prisma: PrismaClient) => EstabelecimentoImpressoraUseCases;
  autenticar: preHandlerAsyncHookHandler;
  resolverTenant: preHandlerAsyncHookHandler;
  exigirEstabelecimento: preHandlerAsyncHookHandler;
  autorizar: (...chaves: string[]) => preHandlerAsyncHookHandler;
}

/**
 * Adaptador HTTP do vínculo estabelecimento ↔ impressora (migrado de
 * EstabelecimentoImpressoraController). Reutiliza as permissões do grupo
 * `impressoras` (gestão de impressoras engloba seus vínculos). O vínculo é o
 * par (estabelecimento, impressora) — não há id surrogate.
 */
export function estabelecimentoImpressoraRoutes(deps: EstabelecimentoImpressoraRoutesDeps) {
  const contexto = [deps.autenticar, deps.resolverTenant, deps.exigirEstabelecimento];
  const seguranca = [{ bearerAuth: [], estabelecimentoHeader: [] }];

  return async function plugin(fastify: FastifyInstance): Promise<void> {
    const app = fastify.withTypeProvider<ZodTypeProvider>();

    // Impressoras de um estabelecimento.
    app.get(
      '/estabelecimentos/:idEstabelecimento/impressoras',
      {
        preHandler: [...contexto, deps.autorizar('impressoras:list')],
        schema: {
          tags: ['estabelecimento-impressoras'],
          summary: 'Lista as impressoras vinculadas a um estabelecimento',
          security: seguranca,
          params: idEstabelecimentoParam,
        },
      },
      async (request, reply) => {
        const { listarPorEstabelecimento } = deps.montarUseCases(request.prismaTenant);
        const resultado = await listarPorEstabelecimento.executar({
          estabelecimentoId: request.params.idEstabelecimento,
        });
        return reply.status(200).send(resultado);
      },
    );

    // Estabelecimentos de uma impressora.
    app.get(
      '/impressoras/:idImpressora/estabelecimentos',
      {
        preHandler: [...contexto, deps.autorizar('impressoras:list')],
        schema: {
          tags: ['estabelecimento-impressoras'],
          summary: 'Lista os estabelecimentos vinculados a uma impressora',
          security: seguranca,
          params: idImpressoraParam,
        },
      },
      async (request, reply) => {
        const { listarPorImpressora } = deps.montarUseCases(request.prismaTenant);
        const resultado = await listarPorImpressora.executar({
          impressoraId: request.params.idImpressora,
        });
        return reply.status(200).send(resultado);
      },
    );

    // Vincular (impressora ↔ estabelecimento).
    app.post(
      '/estabelecimento-impressoras',
      {
        preHandler: [...contexto, deps.autorizar('impressoras:update')],
        schema: {
          tags: ['estabelecimento-impressoras'],
          summary: 'Vincula uma impressora a um estabelecimento',
          security: seguranca,
          body: vincularBody,
        },
      },
      async (request, reply) => {
        const { vincular } = deps.montarUseCases(request.prismaTenant);
        const dto = await vincular.executar({
          estabelecimentoId: request.body.idEstabelecimento,
          impressoraId: request.body.idImpressora,
        });
        return reply.status(201).send(dto);
      },
    );

    // Desvincular (por par).
    app.delete(
      '/estabelecimento-impressoras/:idEstabelecimento/:idImpressora',
      {
        preHandler: [...contexto, deps.autorizar('impressoras:update')],
        schema: {
          tags: ['estabelecimento-impressoras'],
          summary: 'Remove o vínculo impressora ↔ estabelecimento',
          security: seguranca,
          params: parParams,
        },
      },
      async (request, reply) => {
        const { desvincular } = deps.montarUseCases(request.prismaTenant);
        await desvincular.executar({
          estabelecimentoId: request.params.idEstabelecimento,
          impressoraId: request.params.idImpressora,
        });
        return reply.status(204).send();
      },
    );
  };
}
