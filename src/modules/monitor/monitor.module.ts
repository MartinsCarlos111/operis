import type { PrismaClient } from '@prisma/client';
import type { preHandlerAsyncHookHandler } from 'fastify';
import { ListarCentrosTrabalhoOnlineUseCase } from './application/use-cases/centro-trabalho-online.use-cases.js';
import {
  ListarCentrosTrabalhoComColetoresUseCase,
  type RepositoryCentrosComColetores,
  type RepositoryDispositivosComColetores,
  type RepositoryStatusOperacional,
} from './application/use-cases/centros-trabalho-com-coletores.use-case.js';
import {
  MetricasCentroTrabalhoUseCase,
  type RepositoryContadoresDispositivo,
} from './application/use-cases/metricas-centro-trabalho.use-case.js';
import { PrismaCentroTrabalhoOnlineRepository } from './infrastructure/persistence/prisma-centro-trabalho-online.repository.js';
import { monitorRoutes, type MonitorUseCases } from './infrastructure/http/monitor.routes.js';

export interface CadeiaAutorizacaoInjetada {
  autenticar: preHandlerAsyncHookHandler;
  resolverTenant: preHandlerAsyncHookHandler;
  exigirEstabelecimento: preHandlerAsyncHookHandler;
  autorizar: (...chaves: string[]) => preHandlerAsyncHookHandler;
}

/** Formato mínimo do que o módulo iot expõe para consultar contadores/linha do tempo por dispositivo. */
export interface DispositivoIotUseCasesParaMonitor {
  consultarContadores: {
    executar(input: {
      dispositivoId: string;
      estabelecimentoId: string;
      de?: Date | undefined;
      ate?: Date | undefined;
    }): Promise<{ entradas: Array<{ total: number }> }>;
  };
  consultarLinhaDoTempo: {
    executar(input: {
      dispositivoId: string;
      estabelecimentoId: string;
      de?: Date | undefined;
      ate?: Date | undefined;
    }): Promise<{ segmentos: Array<{ inicio: string; fim: string; status: 'ONLINE' | 'OFFLINE' }> }>;
  };
}

/** Dependências de runtime que não são Prisma (resolvidas fora, injetadas). */
export interface DependenciasMonitor {
  /**
   * Seriais conectados ao broker do tenant agora — impl injetada do módulo
   * iot (RabbitMqConsultorConexoes). O módulo monitor não importa iot
   * diretamente (fronteira protegida pelo dependency-cruiser).
   */
  seriaisConectados: (tenantId: string) => Promise<Set<string>>;
  /**
   * Monta os use-cases de contadores/linha do tempo do módulo iot sobre o
   * mesmo PrismaClient do tenant — usado para agregar peças produzidas e %
   * online por centro de trabalho, reaproveitando a regra de negócio já
   * implementada nos endpoints por-dispositivo.
   */
  montarDispositivoUseCases: (prisma: PrismaClient) => DispositivoIotUseCasesParaMonitor;
}

/**
 * Composition root do módulo Monitor (snapshot realtime). A montagem
 * periódica é responsabilidade do `MonitorWorker` (subido pelo processo
 * worker); o módulo (composição API) só expõe a leitura HTTP.
 */
export function construirModuloMonitor(cadeia: CadeiaAutorizacaoInjetada, deps: DependenciasMonitor) {
  const montarUseCases = (prisma: PrismaClient): MonitorUseCases => {
    const repos = new PrismaCentroTrabalhoOnlineRepository(prisma);

    // Adapters locais sobre o mesmo PrismaClient do tenant: consultam tabelas
    // de outros domínios (centros_trabalho, dispositivos_iot) sem importar
    // código de manufatura/iot — só o schema do banco é compartilhado.
    const centrosRepo: RepositoryCentrosComColetores = {
      listarCentros: async (estabelecimentoId) => {
        const rows = await prisma.centroTrabalho.findMany({
          where: { estabelecimentoId },
          select: { idCentroTrabalho: true, codigo: true, descricao: true, status: true },
          orderBy: { codigo: 'asc' },
        });
        return rows;
      },
    };

    const dispositivosRepo: RepositoryDispositivosComColetores = {
      listarDispositivos: async (estabelecimentoId) => {
        const rows = await prisma.dispositivoIot.findMany({
          where: { estabelecimentoId },
          select: { idDispositivoIot: true, nome: true, serial: true, centroTrabalhoId: true },
        });
        return rows.map((r) => ({
          id: r.idDispositivoIot,
          nome: r.nome,
          serial: r.serial,
          centroTrabalhoId: r.centroTrabalhoId,
        }));
      },
      seriaisConectados: deps.seriaisConectados,
    };

    const statusOperacionalRepo: RepositoryStatusOperacional = {
      buscarStatus: async (centroTrabalhoId) => {
        const snapshot = await repos.buscarPorCentroTrabalho(centroTrabalhoId);
        return snapshot?.status ?? null;
      },
    };

    const dispositivoUseCases = deps.montarDispositivoUseCases(prisma);
    const contadoresRepo: RepositoryContadoresDispositivo = {
      consultarTotalContadores: async (dispositivoId, estabelecimentoId, de, ate) => {
        const dto = await dispositivoUseCases.consultarContadores.executar({
          dispositivoId,
          estabelecimentoId,
          de,
          ate,
        });
        return dto.entradas.reduce((soma, e) => soma + e.total, 0);
      },
      consultarLinhaDoTempo: async (dispositivoId, estabelecimentoId, de, ate) => {
        const dto = await dispositivoUseCases.consultarLinhaDoTempo.executar({
          dispositivoId,
          estabelecimentoId,
          de,
          ate,
        });
        return dto.segmentos;
      },
    };

    return {
      listarCentrosTrabalhoOnline: new ListarCentrosTrabalhoOnlineUseCase(repos),
      listarCentrosTrabalhoComColetores: new ListarCentrosTrabalhoComColetoresUseCase(
        centrosRepo,
        dispositivosRepo,
        statusOperacionalRepo,
      ),
      metricasCentroTrabalho: new MetricasCentroTrabalhoUseCase(dispositivosRepo, contadoresRepo),
    };
  };

  return {
    routes: monitorRoutes({ montarUseCases, ...cadeia }),
  };
}