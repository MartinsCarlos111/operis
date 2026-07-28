import type { ConfiguracaoSmtpTenant } from '../../domain/entities/configuracao-smtp-tenant.js';

/**
 * Saída da configuração SMTP. A senha NUNCA é devolvida — apenas um flag
 * indicando que existe uma cifrada.
 */
export interface ConfiguracaoSmtpTenantDTO {
  idTenantSmtp: string;
  tenantId: string;
  host: string;
  porta: number;
  usuario: string;
  remetente: string;
  sslHabilitado: boolean;
  senhaConfigurada: boolean;
}

export function paraConfiguracaoSmtpTenantDTO(
  config: ConfiguracaoSmtpTenant,
): ConfiguracaoSmtpTenantDTO {
  return {
    idTenantSmtp: config.idTenantSmtp,
    tenantId: config.tenantId,
    host: config.host,
    porta: config.porta,
    usuario: config.usuario,
    remetente: config.remetente,
    sslHabilitado: config.sslHabilitado,
    senhaConfigurada: config.senhaCifrada.valor.length > 0,
  };
}
