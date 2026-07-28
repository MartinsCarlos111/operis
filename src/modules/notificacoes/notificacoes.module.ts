import type { PrismaClient } from '@prisma/client';
import type { preHandlerAsyncHookHandler } from 'fastify';
import type { GeradorId } from '@shared/domain/gerador-id.js';
import { CriarRegraNotificacaoUseCase } from './application/use-cases/criar-regra-notificacao.use-case.js';
import { EditarRegraNotificacaoUseCase } from './application/use-cases/editar-regra-notificacao.use-case.js';
import { ExcluirRegraNotificacaoUseCase } from './application/use-cases/excluir-regra-notificacao.use-case.js';
import { BuscarRegraNotificacaoUseCase } from './application/use-cases/buscar-regra-notificacao.use-case.js';
import { ListarRegrasNotificacaoUseCase } from './application/use-cases/listar-regras-notificacao.use-case.js';
import { CriarCondicaoNotificacaoUseCase } from './application/use-cases/criar-condicao-notificacao.use-case.js';
import { EditarCondicaoNotificacaoUseCase } from './application/use-cases/editar-condicao-notificacao.use-case.js';
import { ExcluirCondicaoNotificacaoUseCase } from './application/use-cases/excluir-condicao-notificacao.use-case.js';
import { ListarCondicoesNotificacaoUseCase } from './application/use-cases/listar-condicoes-notificacao.use-case.js';
import { PrismaRegraNotificacaoRepository } from './infrastructure/persistence/prisma-regra-notificacao.repository.js';
import { PrismaCondicaoNotificacaoRepository } from './infrastructure/persistence/prisma-condicao-notificacao.repository.js';
import { notificacaoRoutes, type NotificacaoUseCases } from './infrastructure/http/notificacao.routes.js';

/** A mesma cadeia de autorização exposta pelo módulo usuários. */
export interface CadeiaAutorizacaoInjetada {
  autenticar: preHandlerAsyncHookHandler;
  resolverTenant: preHandlerAsyncHookHandler;
  exigirEstabelecimento: preHandlerAsyncHookHandler;
  autorizar: (...chaves: string[]) => preHandlerAsyncHookHandler;
}

/**
 * Composition root do contexto de notificações (migrado de RegraNotificacao-
 * Controller + CondicaoNotificacaoController + respectivas RN/DAO). Escopo:
 * CADASTRO de regras e suas condições. Motor de disparo e realtime ficam fora.
 */
export function construirModuloNotificacoes(ids: GeradorId, cadeia: CadeiaAutorizacaoInjetada) {
  const montarUseCases = (prisma: PrismaClient): NotificacaoUseCases => {
    const regras = new PrismaRegraNotificacaoRepository(prisma);
    const condicoes = new PrismaCondicaoNotificacaoRepository(prisma);
    return {
      criarRegra: new CriarRegraNotificacaoUseCase(regras, ids),
      editarRegra: new EditarRegraNotificacaoUseCase(regras),
      excluirRegra: new ExcluirRegraNotificacaoUseCase(regras),
      buscarRegra: new BuscarRegraNotificacaoUseCase(regras),
      listarRegras: new ListarRegrasNotificacaoUseCase(regras),
      criarCondicao: new CriarCondicaoNotificacaoUseCase(condicoes, regras, ids),
      editarCondicao: new EditarCondicaoNotificacaoUseCase(condicoes),
      excluirCondicao: new ExcluirCondicaoNotificacaoUseCase(condicoes),
      listarCondicoes: new ListarCondicoesNotificacaoUseCase(condicoes),
    };
  };

  return {
    routes: notificacaoRoutes({ montarUseCases, ...cadeia }),
  };
}
