import type { PrismaClient } from '@prisma/client';
import type { preHandlerAsyncHookHandler } from 'fastify';
import type { GeradorId } from '@shared/domain/gerador-id.js';
import { CriarAreaUseCase } from './application/use-cases/criar-area.use-case.js';
import { EditarAreaUseCase } from './application/use-cases/editar-area.use-case.js';
import { ExcluirAreaUseCase } from './application/use-cases/excluir-area.use-case.js';
import { BuscarAreaUseCase } from './application/use-cases/buscar-area.use-case.js';
import { ListarAreasUseCase } from './application/use-cases/listar-areas.use-case.js';
import { PrismaAreaRepository } from './infrastructure/persistence/prisma-area.repository.js';
import { PrismaVerificadorEstabelecimento } from './infrastructure/gateways/prisma-verificador-estabelecimento.js';
import { areaRoutes, type AreaUseCases } from './infrastructure/http/area.routes.js';

/** A mesma cadeia de autorização exposta pelo módulo usuários. */
export interface CadeiaAutorizacaoInjetada {
  autenticar: preHandlerAsyncHookHandler;
  resolverTenant: preHandlerAsyncHookHandler;
  exigirEstabelecimento: preHandlerAsyncHookHandler;
  autorizar: (...chaves: string[]) => preHandlerAsyncHookHandler;
}

/**
 * Composition root do contexto de áreas (migrado de AreaController/AreaRN/
 * AreaDAO). Expõe uma fábrica que monta os use-cases sobre o banco do tenant
 * resolvido por request; a cadeia de autorização vem por injeção do app.
 */
export function construirModuloAreas(ids: GeradorId, cadeia: CadeiaAutorizacaoInjetada) {
  const montarUseCases = (prisma: PrismaClient): AreaUseCases => {
    const areas = new PrismaAreaRepository(prisma);
    const estabelecimentos = new PrismaVerificadorEstabelecimento(prisma);
    return {
      criarArea: new CriarAreaUseCase(areas, estabelecimentos, ids),
      editarArea: new EditarAreaUseCase(areas, estabelecimentos),
      excluirArea: new ExcluirAreaUseCase(areas),
      buscarArea: new BuscarAreaUseCase(areas),
      listarAreas: new ListarAreasUseCase(areas),
    };
  };

  return {
    routes: areaRoutes({ montarUseCases, ...cadeia }),
  };
}
