import type { PrismaClient } from '@prisma/client';
import type { preHandlerAsyncHookHandler } from 'fastify';
import type { GeradorId } from '@shared/domain/gerador-id.js';
import { CriarImpressoraUseCase } from './application/use-cases/criar-impressora.use-case.js';
import { EditarImpressoraUseCase } from './application/use-cases/editar-impressora.use-case.js';
import { ExcluirImpressoraUseCase } from './application/use-cases/excluir-impressora.use-case.js';
import { BuscarImpressoraUseCase } from './application/use-cases/buscar-impressora.use-case.js';
import { ListarImpressorasUseCase } from './application/use-cases/listar-impressoras.use-case.js';
import { PrismaImpressoraRepository } from './infrastructure/persistence/prisma-impressora.repository.js';
import { impressoraRoutes, type ImpressoraUseCases } from './infrastructure/http/impressora.routes.js';

/** A mesma cadeia de autorização exposta pelo módulo usuários. */
export interface CadeiaAutorizacaoInjetada {
  autenticar: preHandlerAsyncHookHandler;
  resolverTenant: preHandlerAsyncHookHandler;
  exigirEstabelecimento: preHandlerAsyncHookHandler;
  autorizar: (...chaves: string[]) => preHandlerAsyncHookHandler;
}

/**
 * Composition root do contexto de impressoras (migrado de ImpressoraController/
 * ImpressoraRN/ImpressoraDAO). Impressora é global do tenant; a fábrica monta
 * os use-cases sobre o banco do tenant resolvido por request.
 */
export function construirModuloImpressoras(ids: GeradorId, cadeia: CadeiaAutorizacaoInjetada) {
  const montarUseCases = (prisma: PrismaClient): ImpressoraUseCases => {
    const impressoras = new PrismaImpressoraRepository(prisma);
    return {
      criarImpressora: new CriarImpressoraUseCase(impressoras, ids),
      editarImpressora: new EditarImpressoraUseCase(impressoras),
      excluirImpressora: new ExcluirImpressoraUseCase(impressoras),
      buscarImpressora: new BuscarImpressoraUseCase(impressoras),
      listarImpressoras: new ListarImpressorasUseCase(impressoras),
    };
  };

  return {
    routes: impressoraRoutes({ montarUseCases, ...cadeia }),
  };
}
