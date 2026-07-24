import type { PrismaClient } from '@prisma/client';
import type { preHandlerAsyncHookHandler } from 'fastify';
import type { GeradorId } from '@shared/domain/gerador-id.js';
import { CriarUsuarioUseCase } from './application/use-cases/criar-usuario.use-case.js';
import { BuscarUsuarioUseCase } from './application/use-cases/buscar-usuario.use-case.js';
import { VincularUsuarioEstabelecimentoUseCase } from './application/use-cases/vincular-usuario-estabelecimento.use-case.js';
import { PrismaUsuarioRepository } from './infrastructure/persistence/prisma-usuario.repository.js';
import { PrismaUsuarioEstabelecimentoRepository } from './infrastructure/persistence/prisma-usuario-estabelecimento.repository.js';
import { PrismaResolucaoAcesso } from './infrastructure/gateways/prisma-resolucao-acesso.js';
import { PrismaVerificadorNivelAcesso } from './infrastructure/gateways/prisma-verificador-nivel-acesso.js';
import { autenticar, exigirEstabelecimento, autorizar } from './infrastructure/http/autorizacao.js';
import { usuarioRoutes, type UsuarioUseCases } from './infrastructure/http/usuario.routes.js';

export interface CadeiaAutorizacao {
  autenticar: preHandlerAsyncHookHandler;
  resolverTenant: preHandlerAsyncHookHandler;
  exigirEstabelecimento: preHandlerAsyncHookHandler;
  autorizar: (...chaves: string[]) => preHandlerAsyncHookHandler;
}

/**
 * Composition root do contexto de usuários. Os repositórios são montados sobre
 * o banco do tenant por request (fábrica montarUseCases); a resolução de RBAC
 * também roda contra o tenant. Recebe o preHandler resolverTenant por injeção
 * (do composition root) para expô-lo na cadeia de autorização.
 */
export function construirModuloUsuarios(
  ids: GeradorId,
  resolverTenant: preHandlerAsyncHookHandler,
) {
  const cadeia: CadeiaAutorizacao = {
    autenticar,
    resolverTenant,
    exigirEstabelecimento: exigirEstabelecimento(
      (prisma: PrismaClient) => new PrismaResolucaoAcesso(prisma),
    ),
    autorizar,
  };

  const montarUseCases = (prisma: PrismaClient): UsuarioUseCases => {
    const usuarios = new PrismaUsuarioRepository(prisma);
    const vinculos = new PrismaUsuarioEstabelecimentoRepository(prisma);
    const verificadorNivel = new PrismaVerificadorNivelAcesso(prisma);
    return {
      criarUsuario: new CriarUsuarioUseCase(usuarios, ids),
      buscarUsuario: new BuscarUsuarioUseCase(usuarios),
      vincularUsuarioEstabelecimento: new VincularUsuarioEstabelecimentoUseCase(
        usuarios,
        vinculos,
        verificadorNivel,
      ),
    };
  };

  return {
    cadeia,
    routes: usuarioRoutes({ montarUseCases, ...cadeia }),
  };
}
