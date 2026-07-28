import type { PrismaClient } from '@prisma/client';
import type { preHandlerAsyncHookHandler } from 'fastify';
import type { GeradorId } from '@shared/domain/gerador-id.js';
import { CriarEstabelecimentoUseCase } from './application/use-cases/criar-estabelecimento.use-case.js';
import { ListarEstabelecimentosUseCase } from './application/use-cases/listar-estabelecimentos.use-case.js';
import { CriarNivelAcessoUseCase } from './application/use-cases/criar-nivel-acesso.use-case.js';
import { ListarNiveisAcessoUseCase } from './application/use-cases/listar-niveis-acesso.use-case.js';
import { ListarPermissoesUseCase } from './application/use-cases/listar-permissoes.use-case.js';
import { PrismaEstabelecimentoRepository } from './infrastructure/persistence/prisma-estabelecimento.repository.js';
import { PrismaNivelAcessoRepository } from './infrastructure/persistence/prisma-nivel-acesso.repository.js';
import { PrismaPermissaoRepository } from './infrastructure/persistence/prisma-permissao.repository.js';
import {
  estabelecimentoRoutes,
  type EstabelecimentoUseCases,
} from './infrastructure/http/estabelecimento.routes.js';

export interface CadeiaAutorizacaoInjetada {
  autenticar: preHandlerAsyncHookHandler;
  resolverTenant: preHandlerAsyncHookHandler;
  exigirEstabelecimento: preHandlerAsyncHookHandler;
  autorizar: (...chaves: string[]) => preHandlerAsyncHookHandler;
}

/**
 * Composition root do contexto de estabelecimentos. Não recebe mais um
 * PrismaClient fixo: expõe uma fábrica que monta os use-cases sobre o banco do
 * tenant resolvido por request. A cadeia de autorização (incluindo
 * resolverTenant) vem por injeção — a fronteira entre features fica no app.
 */
export function construirModuloEstabelecimentos(
  ids: GeradorId,
  cadeia: CadeiaAutorizacaoInjetada,
) {
  const montarUseCases = (prisma: PrismaClient): EstabelecimentoUseCases => {
    const estabelecimentos = new PrismaEstabelecimentoRepository(prisma);
    const niveis = new PrismaNivelAcessoRepository(prisma);
    const permissoes = new PrismaPermissaoRepository(prisma);
    return {
      criarEstabelecimento: new CriarEstabelecimentoUseCase(estabelecimentos, ids),
      listarEstabelecimentos: new ListarEstabelecimentosUseCase(estabelecimentos),
      criarNivelAcesso: new CriarNivelAcessoUseCase(niveis, permissoes, estabelecimentos, ids),
      listarNiveisAcesso: new ListarNiveisAcessoUseCase(niveis),
      listarPermissoes: new ListarPermissoesUseCase(permissoes),
    };
  };

  return {
    routes: estabelecimentoRoutes({ montarUseCases, ...cadeia }),
  };
}
