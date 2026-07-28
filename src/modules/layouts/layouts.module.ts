import type { PrismaClient } from '@prisma/client';
import type { preHandlerAsyncHookHandler } from 'fastify';
import type { GeradorId } from '@shared/domain/gerador-id.js';
import { CriarVariavelLayoutUseCase } from './application/use-cases/criar-variavel-layout.use-case.js';
import { EditarVariavelLayoutUseCase } from './application/use-cases/editar-variavel-layout.use-case.js';
import { ExcluirVariavelLayoutUseCase } from './application/use-cases/excluir-variavel-layout.use-case.js';
import { BuscarVariavelLayoutUseCase } from './application/use-cases/buscar-variavel-layout.use-case.js';
import { ListarVariaveisLayoutUseCase } from './application/use-cases/listar-variaveis-layout.use-case.js';
import { CriarLayoutEtiquetaUseCase } from './application/use-cases/criar-layout-etiqueta.use-case.js';
import { EditarLayoutEtiquetaUseCase } from './application/use-cases/editar-layout-etiqueta.use-case.js';
import { ExcluirLayoutEtiquetaUseCase } from './application/use-cases/excluir-layout-etiqueta.use-case.js';
import { BuscarLayoutEtiquetaUseCase } from './application/use-cases/buscar-layout-etiqueta.use-case.js';
import { ListarLayoutsEtiquetaUseCase } from './application/use-cases/listar-layouts-etiqueta.use-case.js';
import { PrismaVariavelLayoutRepository } from './infrastructure/persistence/prisma-variavel-layout.repository.js';
import { PrismaLayoutEtiquetaRepository } from './infrastructure/persistence/prisma-layout-etiqueta.repository.js';
import { layoutRoutes, type LayoutUseCases } from './infrastructure/http/layout.routes.js';

/** A mesma cadeia de autorização exposta pelo módulo usuários. */
export interface CadeiaAutorizacaoInjetada {
  autenticar: preHandlerAsyncHookHandler;
  resolverTenant: preHandlerAsyncHookHandler;
  exigirEstabelecimento: preHandlerAsyncHookHandler;
  autorizar: (...chaves: string[]) => preHandlerAsyncHookHandler;
}

/**
 * Composition root de layouts de etiqueta (migrado de VariavelLayoutController +
 * LayoutEtiquetaController + respectivas RN/DAO). Dois agregados CRUD globais
 * do tenant reunidos por afinidade de domínio (impressão/etiquetas).
 */
export function construirModuloLayouts(ids: GeradorId, cadeia: CadeiaAutorizacaoInjetada) {
  const montarUseCases = (prisma: PrismaClient): LayoutUseCases => {
    const variaveis = new PrismaVariavelLayoutRepository(prisma);
    const layouts = new PrismaLayoutEtiquetaRepository(prisma);
    return {
      criarVariavel: new CriarVariavelLayoutUseCase(variaveis, ids),
      editarVariavel: new EditarVariavelLayoutUseCase(variaveis),
      excluirVariavel: new ExcluirVariavelLayoutUseCase(variaveis),
      buscarVariavel: new BuscarVariavelLayoutUseCase(variaveis),
      listarVariaveis: new ListarVariaveisLayoutUseCase(variaveis),
      criarLayout: new CriarLayoutEtiquetaUseCase(layouts, ids),
      editarLayout: new EditarLayoutEtiquetaUseCase(layouts),
      excluirLayout: new ExcluirLayoutEtiquetaUseCase(layouts),
      buscarLayout: new BuscarLayoutEtiquetaUseCase(layouts),
      listarLayouts: new ListarLayoutsEtiquetaUseCase(layouts),
    };
  };

  return {
    routes: layoutRoutes({ montarUseCases, ...cadeia }),
  };
}
