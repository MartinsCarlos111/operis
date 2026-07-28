import type { PrismaClient } from '@prisma/client';
import type { preHandlerAsyncHookHandler } from 'fastify';
import { VincularImpressoraUseCase } from './application/use-cases/vincular-impressora.use-case.js';
import { DesvincularImpressoraUseCase } from './application/use-cases/desvincular-impressora.use-case.js';
import { ListarPorEstabelecimentoUseCase } from './application/use-cases/listar-por-estabelecimento.use-case.js';
import { ListarPorImpressoraUseCase } from './application/use-cases/listar-por-impressora.use-case.js';
import { PrismaEstabelecimentoImpressoraRepository } from './infrastructure/persistence/prisma-estabelecimento-impressora.repository.js';
import {
  PrismaVerificadorEstabelecimento,
  PrismaVerificadorImpressora,
} from './infrastructure/gateways/prisma-verificadores.js';
import {
  estabelecimentoImpressoraRoutes,
  type EstabelecimentoImpressoraUseCases,
} from './infrastructure/http/estabelecimento-impressora.routes.js';

/** A mesma cadeia de autorização exposta pelo módulo usuários. */
export interface CadeiaAutorizacaoInjetada {
  autenticar: preHandlerAsyncHookHandler;
  resolverTenant: preHandlerAsyncHookHandler;
  exigirEstabelecimento: preHandlerAsyncHookHandler;
  autorizar: (...chaves: string[]) => preHandlerAsyncHookHandler;
}

/**
 * Composition root do vínculo estabelecimento ↔ impressora (migrado de
 * EstabelecimentoImpressoraController/RN/DAO). Fecha a lacuna do módulo
 * `impressoras` (impressoras globais precisam ser disponibilizadas por
 * estabelecimento).
 */
export function construirModuloEstabelecimentoImpressoras(cadeia: CadeiaAutorizacaoInjetada) {
  const montarUseCases = (prisma: PrismaClient): EstabelecimentoImpressoraUseCases => {
    const vinculos = new PrismaEstabelecimentoImpressoraRepository(prisma);
    const estabelecimentos = new PrismaVerificadorEstabelecimento(prisma);
    const impressoras = new PrismaVerificadorImpressora(prisma);
    return {
      vincular: new VincularImpressoraUseCase(vinculos, estabelecimentos, impressoras),
      desvincular: new DesvincularImpressoraUseCase(vinculos),
      listarPorEstabelecimento: new ListarPorEstabelecimentoUseCase(vinculos),
      listarPorImpressora: new ListarPorImpressoraUseCase(vinculos),
    };
  };

  return {
    routes: estabelecimentoImpressoraRoutes({ montarUseCases, ...cadeia }),
  };
}
