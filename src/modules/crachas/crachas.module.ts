import type { PrismaClient } from '@prisma/client';
import type { preHandlerAsyncHookHandler } from 'fastify';
import type { GeradorId } from '@shared/domain/gerador-id.js';
import { CriarCrachaUseCase } from './application/use-cases/criar-cracha.use-case.js';
import { EditarCrachaUseCase } from './application/use-cases/editar-cracha.use-case.js';
import { ExcluirCrachaUseCase } from './application/use-cases/excluir-cracha.use-case.js';
import { BuscarCrachaUseCase } from './application/use-cases/buscar-cracha.use-case.js';
import { ListarCrachasUseCase } from './application/use-cases/listar-crachas.use-case.js';
import { PrismaCrachaRepository } from './infrastructure/persistence/prisma-cracha.repository.js';
import { crachaRoutes, type CrachaUseCases } from './infrastructure/http/cracha.routes.js';

/** A mesma cadeia de autorização exposta pelo módulo usuários. */
export interface CadeiaAutorizacaoInjetada {
  autenticar: preHandlerAsyncHookHandler;
  resolverTenant: preHandlerAsyncHookHandler;
  exigirEstabelecimento: preHandlerAsyncHookHandler;
  autorizar: (...chaves: string[]) => preHandlerAsyncHookHandler;
}

/**
 * Composition root do contexto de crachás (migrado de CrachaController/RN/DAO).
 * Crachá é global do tenant; as digitais são geridas à parte (operis-bio-bridge).
 */
export function construirModuloCrachas(ids: GeradorId, cadeia: CadeiaAutorizacaoInjetada) {
  const montarUseCases = (prisma: PrismaClient): CrachaUseCases => {
    const crachas = new PrismaCrachaRepository(prisma);
    return {
      criarCracha: new CriarCrachaUseCase(crachas, ids),
      editarCracha: new EditarCrachaUseCase(crachas),
      excluirCracha: new ExcluirCrachaUseCase(crachas),
      buscarCracha: new BuscarCrachaUseCase(crachas),
      listarCrachas: new ListarCrachasUseCase(crachas),
    };
  };

  return {
    routes: crachaRoutes({ montarUseCases, ...cadeia }),
  };
}
