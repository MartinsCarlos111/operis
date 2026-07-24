import type { FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import type { ResolucaoAcesso } from '../../domain/gateways/resolucao-acesso.js';

/**
 * Cadeia de autorização em runtime (adaptada da referência de RBAC):
 *
 *   Request
 *     → autenticar             (quem é o usuário?        → 401)
 *     → exigirEstabelecimento  (em qual tenant? nível?   → 400/404)
 *     → autorizar('x:y')       (tem as permissões? AND   → 403)
 *     → handler
 *
 * Decisão de segurança: o JWT carrega SÓ a identidade (sub = usuarioId).
 * As permissões são resolvidas a cada request a partir do header
 * x-estabelecimento-id — revogação imediata e isolamento entre tenants.
 */

declare module 'fastify' {
  interface FastifyRequest {
    usuarioId: string;
    estabelecimentoId: string;
    nivelAcessoId: string;
    nivelNome: string;
    permissoes: string[];
  }
}

/**
 * Payload único do JWT da aplicação. `tipo` discrimina a origem do token:
 * usuário de negócio (sem tipo, legado), administrador de tenant ou
 * super-admin do painel /admin — cada cadeia de autenticação valida o seu.
 */
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: string;
      tipo?: 'super_admin' | 'tenant_admin' | undefined;
      tenantId?: string | undefined;
    };
    user: {
      sub: string;
      tipo?: 'super_admin' | 'tenant_admin' | undefined;
      tenantId?: string | undefined;
    };
  }
}

const HEADER_ESTABELECIMENTO = 'x-estabelecimento-id';
const uuidSchema = z.string().uuid();

function negar(reply: FastifyReply, status: number, code: string, message: string) {
  return reply.status(status).send({ error: { code, message } });
}

/** Valida o JWT (Authorization: Bearer) e popula request.usuarioId. */
export const autenticar: preHandlerAsyncHookHandler = async (request, reply) => {
  try {
    const payload = await request.jwtVerify<{ sub: string }>();
    request.usuarioId = payload.sub;
  } catch {
    return negar(reply, 401, 'NAO_AUTORIZADO', 'Token ausente ou inválido');
  }
};

/**
 * Lê o header x-estabelecimento-id, resolve o vínculo ativo do usuário naquele
 * estabelecimento e injeta nível + permissões no request.
 *
 * Recebe uma FÁBRICA de ResolucaoAcesso: a resolução de RBAC roda contra o
 * banco do tenant (request.prismaTenant), pois os vínculos usuário↔nível vivem
 * no Data Plane, não no banco global. Exige que resolverTenant já tenha rodado.
 */
export function exigirEstabelecimento(
  montarResolucao: (prisma: PrismaClient) => ResolucaoAcesso,
): preHandlerAsyncHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const resolucao = montarResolucao(request.prismaTenant);
    const bruto = request.headers[HEADER_ESTABELECIMENTO];
    if (!bruto || typeof bruto !== 'string') {
      return negar(
        reply,
        400,
        'ESTABELECIMENTO_NAO_INFORMADO',
        `Envie o estabelecimento ativo no header ${HEADER_ESTABELECIMENTO}`,
      );
    }

    const parsed = uuidSchema.safeParse(bruto);
    if (!parsed.success) {
      return negar(reply, 400, 'ESTABELECIMENTO_INVALIDO', 'O id do estabelecimento não é um UUID válido');
    }

    const acesso = await resolucao.resolver(request.usuarioId, parsed.data);
    if (!acesso) {
      return negar(
        reply,
        404,
        'SEM_ACESSO_AO_ESTABELECIMENTO',
        `Sem vínculo ativo com o estabelecimento "${parsed.data}"`,
      );
    }

    request.estabelecimentoId = parsed.data;
    request.nivelAcessoId = acesso.nivelAcessoId;
    request.nivelNome = acesso.nivelNome;
    request.permissoes = acesso.permissoes;
  };
}

/**
 * Fábrica: exige TODAS as permissões informadas (lógica AND), comparação por
 * string exata — sem hierarquia implícita ("manufatura" não concede
 * "manufatura:create").
 */
export function autorizar(...chavesExigidas: string[]): preHandlerAsyncHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const concedidas = new Set(request.permissoes ?? []);
    const faltantes = chavesExigidas.filter((chave) => !concedidas.has(chave));
    if (faltantes.length > 0) {
      return negar(
        reply,
        403,
        'PERMISSAO_NEGADA',
        `Permissões necessárias ausentes: ${faltantes.join(', ')}`,
      );
    }
  };
}
