import type { FastifyInstance, preHandlerAsyncHookHandler } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { CriarUsuarioUseCase } from '../../application/use-cases/criar-usuario.use-case.js';
import type { BuscarUsuarioUseCase } from '../../application/use-cases/buscar-usuario.use-case.js';
import type { VincularUsuarioEstabelecimentoUseCase } from '../../application/use-cases/vincular-usuario-estabelecimento.use-case.js';

const criarUsuarioBody = z.object({
  nome: z.string().min(2),
  email: z.string().min(1),
  biometria: z.boolean().optional(),
  politicasLogin: z.record(z.unknown()).optional(),
});

const usuarioParams = z.object({ id: z.string().uuid() });

const vincularBody = z.object({
  usuarioId: z.string().uuid(),
  nivelAcessoId: z.string().uuid(),
});

/** Use-cases do contexto, montados sobre o PrismaClient de UM tenant. */
export interface UsuarioUseCases {
  criarUsuario: CriarUsuarioUseCase;
  buscarUsuario: BuscarUsuarioUseCase;
  vincularUsuarioEstabelecimento: VincularUsuarioEstabelecimentoUseCase;
}

export interface UsuarioRoutesDeps {
  montarUseCases: (prisma: PrismaClient) => UsuarioUseCases;
  autenticar: preHandlerAsyncHookHandler;
  resolverTenant: preHandlerAsyncHookHandler;
  exigirEstabelecimento: preHandlerAsyncHookHandler;
  autorizar: (...chaves: string[]) => preHandlerAsyncHookHandler;
}

export function usuarioRoutes(deps: UsuarioRoutesDeps) {
  const contexto = [deps.autenticar, deps.resolverTenant, deps.exigirEstabelecimento];

  return async function plugin(fastify: FastifyInstance): Promise<void> {
    const app = fastify.withTypeProvider<ZodTypeProvider>();

    // Cria a identidade do usuário no banco do tenant. Ao entrar auth completa,
    // proteger com autorizar('configuracoes:usuarios').
    app.post(
      '/usuarios',
      {
        preHandler: [deps.autenticar, deps.resolverTenant],
        schema: {
          tags: ['usuarios'],
          summary: 'Cria um usuário',
          security: [{ bearerAuth: [] }],
          body: criarUsuarioBody,
        },
      },
      async (request, reply) => {
        const { criarUsuario } = deps.montarUseCases(request.prismaTenant);
        const dto = await criarUsuario.executar(request.body);
        return reply.status(201).send(dto);
      },
    );

    app.get(
      '/usuarios/:id',
      {
        preHandler: [deps.autenticar, deps.resolverTenant],
        schema: {
          tags: ['usuarios'],
          summary: 'Busca um usuário por id',
          security: [{ bearerAuth: [] }],
          params: usuarioParams,
        },
      },
      async (request, reply) => {
        const { buscarUsuario } = deps.montarUseCases(request.prismaTenant);
        const dto = await buscarUsuario.executar(request.params.id);
        return reply.status(200).send(dto);
      },
    );

    // Vincula um usuário ao estabelecimento do contexto (header), com um nível.
    app.post(
      '/vinculos',
      {
        preHandler: [...contexto, deps.autorizar('configuracoes:usuarios')],
        schema: {
          tags: ['usuarios'],
          summary: 'Vincula um usuário ao estabelecimento ativo com um nível de acesso',
          security: [{ bearerAuth: [], estabelecimentoHeader: [] }],
          body: vincularBody,
        },
      },
      async (request, reply) => {
        const { vincularUsuarioEstabelecimento } = deps.montarUseCases(request.prismaTenant);
        const dto = await vincularUsuarioEstabelecimento.executar({
          ...request.body,
          estabelecimentoId: request.estabelecimentoId,
        });
        return reply.status(201).send(dto);
      },
    );
  };
}
