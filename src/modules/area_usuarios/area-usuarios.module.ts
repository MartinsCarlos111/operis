import type { PrismaClient } from '@prisma/client';
import type { preHandlerAsyncHookHandler } from 'fastify';
import { VincularUsuarioAreaUseCase } from './application/use-cases/vincular-usuario-area.use-case.js';
import { DesvincularUsuarioAreaUseCase } from './application/use-cases/desvincular-usuario-area.use-case.js';
import { ListarPorAreaUseCase } from './application/use-cases/listar-por-area.use-case.js';
import { ListarPorUsuarioUseCase } from './application/use-cases/listar-por-usuario.use-case.js';
import { PrismaAreaUsuarioRepository } from './infrastructure/persistence/prisma-area-usuario.repository.js';
import {
  PrismaVerificadorArea,
  PrismaVerificadorUsuario,
} from './infrastructure/gateways/prisma-verificadores.js';
import {
  areaUsuarioRoutes,
  type AreaUsuarioUseCases,
} from './infrastructure/http/area-usuario.routes.js';

/** A mesma cadeia de autorização exposta pelo módulo usuários. */
export interface CadeiaAutorizacaoInjetada {
  autenticar: preHandlerAsyncHookHandler;
  resolverTenant: preHandlerAsyncHookHandler;
  exigirEstabelecimento: preHandlerAsyncHookHandler;
  autorizar: (...chaves: string[]) => preHandlerAsyncHookHandler;
}

/**
 * Composition root do vínculo área ↔ usuário (migrado de AreaUsuarioController/
 * RN/DAO). Fecha a lacuna do módulo `areas` (usuários operam em áreas).
 */
export function construirModuloAreaUsuarios(cadeia: CadeiaAutorizacaoInjetada) {
  const montarUseCases = (prisma: PrismaClient): AreaUsuarioUseCases => {
    const vinculos = new PrismaAreaUsuarioRepository(prisma);
    const areas = new PrismaVerificadorArea(prisma);
    const usuarios = new PrismaVerificadorUsuario(prisma);
    return {
      vincular: new VincularUsuarioAreaUseCase(vinculos, areas, usuarios),
      desvincular: new DesvincularUsuarioAreaUseCase(vinculos),
      listarPorArea: new ListarPorAreaUseCase(vinculos),
      listarPorUsuario: new ListarPorUsuarioUseCase(vinculos),
    };
  };

  return {
    routes: areaUsuarioRoutes({ montarUseCases, ...cadeia }),
  };
}
