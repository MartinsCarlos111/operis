import type { FastifyInstance, preHandlerAsyncHookHandler } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { VincularUsuarioAreaUseCase } from '../../application/use-cases/vincular-usuario-area.use-case.js';
import type { DesvincularUsuarioAreaUseCase } from '../../application/use-cases/desvincular-usuario-area.use-case.js';
import type { ListarPorAreaUseCase } from '../../application/use-cases/listar-por-area.use-case.js';
import type { ListarPorUsuarioUseCase } from '../../application/use-cases/listar-por-usuario.use-case.js';

const vincularBody = z.object({
  idArea: z.string().uuid(),
  idUsuario: z.string().uuid(),
});

const parParams = z.object({
  idArea: z.string().uuid(),
  idUsuario: z.string().uuid(),
});
const idAreaParam = z.object({ idArea: z.string().uuid() });
const idUsuarioParam = z.object({ idUsuario: z.string().uuid() });

/** Use-cases do contexto, montados sobre o PrismaClient de UM tenant. */
export interface AreaUsuarioUseCases {
  vincular: VincularUsuarioAreaUseCase;
  desvincular: DesvincularUsuarioAreaUseCase;
  listarPorArea: ListarPorAreaUseCase;
  listarPorUsuario: ListarPorUsuarioUseCase;
}

export interface AreaUsuarioRoutesDeps {
  montarUseCases: (prisma: PrismaClient) => AreaUsuarioUseCases;
  autenticar: preHandlerAsyncHookHandler;
  resolverTenant: preHandlerAsyncHookHandler;
  exigirEstabelecimento: preHandlerAsyncHookHandler;
  autorizar: (...chaves: string[]) => preHandlerAsyncHookHandler;
}

/**
 * Adaptador HTTP do vínculo área ↔ usuário (migrado de AreaUsuarioController).
 * Reutiliza as permissões do grupo `areas` (a gestão de áreas engloba seus
 * vínculos de usuário). O vínculo é o par (área, usuário) — sem id surrogate.
 */
export function areaUsuarioRoutes(deps: AreaUsuarioRoutesDeps) {
  const contexto = [deps.autenticar, deps.resolverTenant, deps.exigirEstabelecimento];
  const seguranca = [{ bearerAuth: [], estabelecimentoHeader: [] }];

  return async function plugin(fastify: FastifyInstance): Promise<void> {
    const app = fastify.withTypeProvider<ZodTypeProvider>();

    // Usuários de uma área.
    app.get(
      '/areas/:idArea/usuarios',
      {
        preHandler: [...contexto, deps.autorizar('areas:list')],
        schema: {
          tags: ['area-usuarios'],
          summary: 'Lista os usuários vinculados a uma área',
          security: seguranca,
          params: idAreaParam,
        },
      },
      async (request, reply) => {
        const { listarPorArea } = deps.montarUseCases(request.prismaTenant);
        const resultado = await listarPorArea.executar({ areaId: request.params.idArea });
        return reply.status(200).send(resultado);
      },
    );

    // Áreas de um usuário.
    app.get(
      '/usuarios/:idUsuario/areas',
      {
        preHandler: [...contexto, deps.autorizar('areas:list')],
        schema: {
          tags: ['area-usuarios'],
          summary: 'Lista as áreas vinculadas a um usuário',
          security: seguranca,
          params: idUsuarioParam,
        },
      },
      async (request, reply) => {
        const { listarPorUsuario } = deps.montarUseCases(request.prismaTenant);
        const resultado = await listarPorUsuario.executar({ usuarioId: request.params.idUsuario });
        return reply.status(200).send(resultado);
      },
    );

    // Vincular usuário ↔ área.
    app.post(
      '/area-usuarios',
      {
        preHandler: [...contexto, deps.autorizar('areas:update')],
        schema: {
          tags: ['area-usuarios'],
          summary: 'Vincula um usuário a uma área',
          security: seguranca,
          body: vincularBody,
        },
      },
      async (request, reply) => {
        const { vincular } = deps.montarUseCases(request.prismaTenant);
        const dto = await vincular.executar({
          areaId: request.body.idArea,
          usuarioId: request.body.idUsuario,
        });
        return reply.status(201).send(dto);
      },
    );

    // Desvincular (por par).
    app.delete(
      '/area-usuarios/:idArea/:idUsuario',
      {
        preHandler: [...contexto, deps.autorizar('areas:update')],
        schema: {
          tags: ['area-usuarios'],
          summary: 'Remove o vínculo usuário ↔ área',
          security: seguranca,
          params: parParams,
        },
      },
      async (request, reply) => {
        const { desvincular } = deps.montarUseCases(request.prismaTenant);
        await desvincular.executar({
          areaId: request.params.idArea,
          usuarioId: request.params.idUsuario,
        });
        return reply.status(204).send();
      },
    );
  };
}
