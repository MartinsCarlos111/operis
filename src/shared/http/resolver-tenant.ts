import type {
  FastifyReply,
  FastifyRequest,
  preHandlerAsyncHookHandler,
} from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { ConnectionManager } from '@shared/tenant-runtime/index.js';
import { TenantNaoResolvidoError } from '@shared/tenant-runtime/index.js';

declare module 'fastify' {
  interface FastifyRequest {
    /** PrismaClient do banco dedicado do tenant, resolvido por request. */
    prismaTenant: PrismaClient;
  }
}

function negar(reply: FastifyReply, status: number, code: string, message: string) {
  return reply.status(status).send({ error: { code, message } });
}

/**
 * preHandler que fecha o elo Control Plane → Data Plane: lê o tenantId do JWT
 * (já validado por `autenticar`), pede ao ConnectionManager o PrismaClient
 * daquele banco e o injeta em request.prismaTenant. Deve rodar DEPOIS de
 * `autenticar`.
 *
 * O JWT do tenant-admin carrega tenantId; o JWT de usuário de negócio legado
 * não — nesse caso, sem tenantId, a request é barrada (não há banco a resolver).
 */
export function resolverTenant(manager: ConnectionManager): preHandlerAsyncHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.user?.tenantId;
    if (!tenantId) {
      return negar(
        reply,
        403,
        'TENANT_NAO_INFORMADO',
        'O token não está vinculado a um tenant',
      );
    }

    try {
      request.prismaTenant = await manager.getConnection(tenantId);
    } catch (erro) {
      if (erro instanceof TenantNaoResolvidoError) {
        return negar(reply, 404, 'TENANT_NAO_ENCONTRADO', 'Tenant sem banco configurado');
      }
      request.log.error({ err: erro, tenantId }, 'falha ao resolver conexão do tenant');
      return negar(
        reply,
        503,
        'BANCO_TENANT_INDISPONIVEL',
        'Não foi possível conectar ao banco do tenant',
      );
    }
  };
}
