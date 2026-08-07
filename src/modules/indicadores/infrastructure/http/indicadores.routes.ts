import type { FastifyInstance, preHandlerAsyncHookHandler } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { MontarOeeUseCase } from '../../application/use-cases/montar-oee.use-case.js';
import type { TurnoLike } from '../../domain/services/montar-oee.service.js';
import type {
  ListarAcompanhamentoProducaoUseCase,
  ListarCalculoIndicadoresUseCase,
  ListarDisponivelProduzindoParadaUseCase,
} from '../../application/use-cases/listar-indicadores.use-cases.js';

export interface IndicadoresUseCases {
  montarOee: MontarOeeUseCase;
  listarCalculoIndicadores: ListarCalculoIndicadoresUseCase;
  listarAcompanhamentoProducao: ListarAcompanhamentoProducaoUseCase;
  listarDisponivelProduzindoParada: ListarDisponivelProduzindoParadaUseCase;
}

export interface IndicadoresRoutesDeps {
  montarUseCases: (prisma: PrismaClient) => IndicadoresUseCases;
  autenticar: preHandlerAsyncHookHandler;
  resolverTenant: preHandlerAsyncHookHandler;
  exigirEstabelecimento: preHandlerAsyncHookHandler;
  autorizar: (...chaves: string[]) => preHandlerAsyncHookHandler;
}

const listarQuery = z.object({
  startIndex: z.coerce.number().int().min(0).default(0),
  maxRows: z.coerce.number().int().min(1).max(500).default(50),
  centroTrabalhoId: z.string().uuid().optional(),
  turnoId: z.string().uuid().optional(),
  dataInicio: z.coerce.date().optional(),
  dataFim: z.coerce.date().optional(),
});

const recalcularBody = z.object({
  centroTrabalhoId: z.string().uuid(),
  turnoId: z.string().uuid(),
  diaTurno: z.coerce.date(),
  custoMaquinaHora: z.number().min(0).default(0),
  qtdMeta: z.number().min(0).default(0),
});

export function indicadoresRoutes(deps: IndicadoresRoutesDeps) {
  const contexto = [deps.autenticar, deps.resolverTenant, deps.exigirEstabelecimento];
  const seguranca = [{ bearerAuth: [], estabelecimentoHeader: [] }];

  return async function plugin(fastify: FastifyInstance): Promise<void> {
    const app = fastify.withTypeProvider<ZodTypeProvider>();

    app.get(
      '/indicadores',
      {
        preHandler: [...contexto, deps.autorizar('indicadores:list')],
        schema: {
          tags: ['indicadores'],
          summary: 'Lista cálculos de indicadores por período (paginado)',
          security: seguranca,
          querystring: listarQuery,
        },
      },
      async (request, reply) => {
        const { listarCalculoIndicadores } = deps.montarUseCases(request.prismaTenant);
        return reply.status(200).send(
          await listarCalculoIndicadores.executar({
            estabelecimentoId: request.estabelecimentoId,
            ...request.query,
          }),
        );
      },
    );

    app.get(
      '/indicadores/acompanhamento-producao',
      {
        preHandler: [...contexto, deps.autorizar('indicadores:list')],
        schema: {
          tags: ['indicadores'],
          summary: 'Acompanhamento de produção consolidado por dia',
          security: seguranca,
          querystring: z.object({
            dataInicio: z.coerce.date(),
            dataFim: z.coerce.date(),
            centroTrabalhoId: z.string().uuid().optional(),
          }),
        },
      },
      async (request, reply) => {
        const { listarAcompanhamentoProducao } = deps.montarUseCases(request.prismaTenant);
        return reply.status(200).send(
          await listarAcompanhamentoProducao.executar({
            estabelecimentoId: request.estabelecimentoId,
            dataInicio: request.query.dataInicio,
            dataFim: request.query.dataFim,
            centroTrabalhoId: request.query.centroTrabalhoId,
          }),
        );
      },
    );

    app.get(
      '/indicadores/disponivel-produzindo-parada',
      {
        preHandler: [...contexto, deps.autorizar('indicadores:list')],
        schema: {
          tags: ['indicadores'],
          summary: 'Soma de tempos Disponível/Produzindo/Parada por centro',
          security: seguranca,
          querystring: z.object({
            dataInicio: z.coerce.date(),
            dataFim: z.coerce.date(),
            centroTrabalhoId: z.string().uuid().optional(),
          }),
        },
      },
      async (request, reply) => {
        const { listarDisponivelProduzindoParada } = deps.montarUseCases(request.prismaTenant);
        return reply.status(200).send(
          await listarDisponivelProduzindoParada.executar({
            estabelecimentoId: request.estabelecimentoId,
            dataInicio: request.query.dataInicio,
            dataFim: request.query.dataFim,
            centroTrabalhoId: request.query.centroTrabalhoId,
          }),
        );
      },
    );

    app.post(
      '/indicadores/recalcular',
      {
        preHandler: [...contexto, deps.autorizar('indicadores:update')],
        schema: {
          tags: ['indicadores'],
          summary: 'Recalcula OEE/TEEP de um turno específico (admin)',
          security: seguranca,
          body: recalcularBody,
        },
      },
      async (request, reply) => {
        const { montarOee } = deps.montarUseCases(request.prismaTenant);
        const turno = await request.prismaTenant.turno.findUnique({
          where: { idTurno: request.body.turnoId },
        });
        if (!turno) return reply.status(404).send({ error: { code: 'TURNO_NAO_ENCONTRADO', message: 'Turno não encontrado.' } });
        const turnoLike: TurnoLike = {
          idTurno: turno.idTurno,
          inicioMinutos: turno.inicioMinutos,
          fimMinutos: turno.fimMinutos,
          tempoTotalMinutos: turno.tempoTotalMinutos,
          tempoDisponivelMinutos: turno.tempoDisponivelMinutos,
          diasSemana: turno.diasSemana,
          resolverJanela(dia: Date) {
            const base = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate());
            const i = new Date(base); i.setMinutes(this.inicioMinutos);
            const f = new Date(base); f.setMinutes(this.fimMinutos);
            const viraODia = i >= f;
            if (viraODia) f.setDate(f.getDate() + 1);
            return { inicio: i, fim: f, viraODia };
          },
          praticadoEm() { return true; },
        };
        const resultado = await montarOee.executar({
          estabelecimentoId: request.estabelecimentoId,
          centroTrabalhoId: request.body.centroTrabalhoId,
          turno: turnoLike,
          diaTurno: request.body.diaTurno,
          custoMaquinaHora: request.body.custoMaquinaHora,
          qtdMeta: request.body.qtdMeta,
        });
        return reply.status(200).send(resultado ? { idCalculoIndicadores: resultado.idCalculoIndicadores } : null);
      },
    );
  };
}