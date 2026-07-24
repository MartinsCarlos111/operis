import type { Tenant } from '../../domain/entities/tenant.js';
import type { StatusRecurso } from '@shared/domain/status-recurso.js';
import type { StatusConexao } from '../../domain/value-objects/status-conexao.js';

/**
 * DTO do tenant para o painel /admin. A senha do banco NUNCA aparece aqui —
 * nem cifrada. Diretriz da especificação: credenciais não são exibidas na
 * interface administrativa, apenas substituídas quando necessário.
 */
export interface TenantDTO {
  idTenant: string;
  nome: string;
  slug: string;
  status: StatusRecurso;
  banco: {
    provider: string;
    host: string;
    porta: number;
    nomeBanco: string;
    usuario: string;
    sslHabilitado: boolean;
    statusConexao: StatusConexao;
    ultimaConexaoEm: string | null;
  } | null;
  criadoEm: string;
  atualizadoEm: string;
}

export function paraTenantDTO(tenant: Tenant): TenantDTO {
  const banco = tenant.banco;
  return {
    idTenant: tenant.idTenant,
    nome: tenant.nome,
    slug: tenant.slug.valor,
    status: tenant.status,
    banco: banco
      ? {
          provider: banco.provider,
          host: banco.host,
          porta: banco.porta,
          nomeBanco: banco.nomeBanco,
          usuario: banco.usuario,
          sslHabilitado: banco.sslHabilitado,
          statusConexao: banco.statusConexao,
          ultimaConexaoEm: banco.ultimaConexaoEm?.toISOString() ?? null,
        }
      : null,
    criadoEm: tenant.criadoEm.toISOString(),
    atualizadoEm: tenant.atualizadoEm.toISOString(),
  };
}
