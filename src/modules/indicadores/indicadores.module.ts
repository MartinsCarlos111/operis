import type { PrismaClient } from '@prisma/client';
import type { preHandlerAsyncHookHandler } from 'fastify';
import type { GeradorId } from '@shared/domain/gerador-id.js';
import { MontarOeeService } from './domain/services/montar-oee.service.js';
import { MontarOeeUseCase } from './application/use-cases/montar-oee.use-case.js';
import {
  ListarAcompanhamentoProducaoUseCase,
  ListarCalculoIndicadoresUseCase,
  ListarDisponivelProduzindoParadaUseCase,
} from './application/use-cases/listar-indicadores.use-cases.js';
import {
  PrismaCalculoIndicadoresRepository,
} from './infrastructure/persistence/prisma-calculo-indicadores.repository.js';
import { PrismaFonteMovimentos } from './infrastructure/persistence/prisma-fonte-movimentos.js';
import { indicadoresRoutes, type IndicadoresUseCases } from './infrastructure/http/indicadores.routes.js';

export interface CadeiaAutorizacaoInjetada {
  autenticar: preHandlerAsyncHookHandler;
  resolverTenant: preHandlerAsyncHookHandler;
  exigirEstabelecimento: preHandlerAsyncHookHandler;
  autorizar: (...chaves: string[]) => preHandlerAsyncHookHandler;
}

/**
 * Composition root do módulo Indicadores. Reúne o cálculo de OEE/TEEP, as
 * queries de acompanhamento de produção e a porta de movimentos (fronteira
 * com manufatura — só lê).
 */
export function construirModuloIndicadores(ids: GeradorId, cadeia: CadeiaAutorizacaoInjetada) {
  const montarUseCases = (prisma: PrismaClient): IndicadoresUseCases => {
    const repos = new PrismaCalculoIndicadoresRepository(prisma);
    const fonteMov = new PrismaFonteMovimentos(prisma);
    const serviço = new MontarOeeService(fonteMov, repos, ids);
    return {
      montarOee: new MontarOeeUseCase(serviço),
      listarCalculoIndicadores: new ListarCalculoIndicadoresUseCase(repos),
      listarAcompanhamentoProducao: new ListarAcompanhamentoProducaoUseCase(repos),
      listarDisponivelProduzindoParada: new ListarDisponivelProduzindoParadaUseCase(repos),
    };
  };

  return { routes: indicadoresRoutes({ montarUseCases, ...cadeia }) };
}