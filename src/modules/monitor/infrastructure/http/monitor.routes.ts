import type { FastifyInstance, preHandlerAsyncHookHandler } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { ListarCentrosTrabalhoOnlineUseCase } from '../../application/use-cases/centro-trabalho-online.use-cases.js';
import type { ListarCentrosTrabalhoComColetoresUseCase } from '../../application/use-cases/centros-trabalho-com-coletores.use-case.js';
import type { MetricasCentroTrabalhoUseCase } from '../../application/use-cases/metricas-centro-trabalho.use-case.js';
import { StatusCentroTrabalhoOnline } from '../../domain/entities/centro-trabalho-online.js';

export interface MonitorUseCases {
  listarCentrosTrabalhoOnline: ListarCentrosTrabalhoOnlineUseCase;
  listarCentrosTrabalhoComColetores: ListarCentrosTrabalhoComColetoresUseCase;
  metricasCentroTrabalho: MetricasCentroTrabalhoUseCase;
}

export interface MonitorRoutesDeps {
  montarUseCases: (prisma: PrismaClient) => MonitorUseCases;
  autenticar: preHandlerAsyncHookHandler;
  resolverTenant: preHandlerAsyncHookHandler;
  exigirEstabelecimento: preHandlerAsyncHookHandler;
  autorizar: (...chaves: string[]) => preHandlerAsyncHookHandler;
}

const listarQuery = z.object({
  startIndex: z.coerce.number().int().min(0).default(0),
  maxRows: z.coerce.number().int().min(1).max(500).default(200),
  status: z.enum([
    'PRODUZINDO',
    'PARADA',
    'EM_SETUP',
    'MANUTENCAO_SOLICITADA',
    'MANUTENCAO_EM_ATENDIMENTO',
    'OCIOSA',
    'DESCONECTADA',
    'BAIXO_DESEMPENHO',
  ]).optional(),
  grupoMaquinaId: z.string().uuid().optional(),
});

const idParam = z.object({ id: z.string().uuid() });

const periodoQuery = z.object({
  de: z.string().datetime(),
  ate: z.string().datetime(),
});

void StatusCentroTrabalhoOnline;

/**
 * O tenantId é garantido pelo preHandler `resolverTenant`, que barra com 403
 * qualquer request cujo token não esteja vinculado a um tenant. O throw aqui é
 * defesa em profundidade: se a cadeia mudar, falha explicitamente em vez de
 * consultar o broker com um tenant vazio.
 */
function tenantIdDe(request: { user?: { tenantId?: string | undefined } }): string {
  const tenantId = request.user?.tenantId;
  if (!tenantId) {
    throw new Error('tenantId ausente na request — resolverTenant deveria tê-la barrado');
  }
  return tenantId;
}

export function monitorRoutes(deps: MonitorRoutesDeps) {
  const contexto = [deps.autenticar, deps.resolverTenant, deps.exigirEstabelecimento];
  const seguranca = [{ bearerAuth: [], estabelecimentoHeader: [] }];

  return async function plugin(fastify: FastifyInstance): Promise<void> {
    const app = fastify.withTypeProvider<ZodTypeProvider>();

    app.get(
      '/monitor/centros-trabalho-online',
      {
        preHandler: [...contexto, deps.autorizar('monitor:list')],
        schema: {
          tags: ['monitor'],
          summary: 'Lista o snapshot online dos centros de trabalho ativos',
          security: seguranca,
          querystring: listarQuery,
        },
      },
      async (request, reply) => {
        const { listarCentrosTrabalhoOnline } = deps.montarUseCases(request.prismaTenant);
        const itens = await listarCentrosTrabalhoOnline.executar({
          estabelecimentoId: request.estabelecimentoId,
          status: request.query.status,
          grupoMaquinaId: request.query.grupoMaquinaId,
        });
        return reply.status(200).send({
          itens,
          total: itens.length,
        });
      },
    );

    app.get(
      '/monitor/centros-trabalho-coletores',
      {
        preHandler: [...contexto, deps.autorizar('monitor:list')],
        schema: {
          tags: ['monitor'],
          summary: 'Lista os centros de trabalho com os coletores IoT vinculados e o status online de cada um',
          security: seguranca,
        },
      },
      async (request, reply) => {
        const { listarCentrosTrabalhoComColetores } = deps.montarUseCases(request.prismaTenant);
        const itens = await listarCentrosTrabalhoComColetores.executar({
          estabelecimentoId: request.estabelecimentoId,
          tenantId: tenantIdDe(request),
        });
        return reply.status(200).send({ itens });
      },
    );

    app.get(
      '/monitor/centros-trabalho/:id/metricas',
      {
        preHandler: [...contexto, deps.autorizar('monitor:list')],
        schema: {
          tags: ['monitor'],
          summary: 'Peças produzidas e % de tempo online agregados de um centro de trabalho no período',
          security: seguranca,
          params: idParam,
          querystring: periodoQuery,
        },
      },
      async (request, reply) => {
        const { metricasCentroTrabalho } = deps.montarUseCases(request.prismaTenant);
        const dto = await metricasCentroTrabalho.executar({
          centroTrabalhoId: request.params.id,
          estabelecimentoId: request.estabelecimentoId,
          de: new Date(request.query.de),
          ate: new Date(request.query.ate),
        });
        return reply.status(200).send(dto);
      },
    );
  };
}