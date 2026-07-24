import type { preHandlerAsyncHookHandler } from 'fastify';

/**
 * Autenticação ISOLADA do painel /admin. Só aceita JWT com tipo 'super_admin' —
 * tokens de usuários de negócio ou de administradores de tenant são recusados,
 * mesmo sendo assinaturas válidas. A recíproca vale nas rotas de negócio: um
 * token de super-admin não tem vínculo com estabelecimento nenhum.
 */

declare module 'fastify' {
  interface FastifyRequest {
    superAdminId: string;
  }
}

export const autenticarSuperAdmin: preHandlerAsyncHookHandler = async (request, reply) => {
  try {
    const payload = await request.jwtVerify<{ sub: string; tipo?: string }>();
    if (payload.tipo !== 'super_admin') {
      return reply.status(403).send({
        error: { code: 'ACESSO_RESTRITO', message: 'Rota exclusiva de super-administradores' },
      });
    }
    request.superAdminId = payload.sub;
  } catch {
    return reply.status(401).send({
      error: { code: 'NAO_AUTORIZADO', message: 'Token ausente ou inválido' },
    });
  }
};
