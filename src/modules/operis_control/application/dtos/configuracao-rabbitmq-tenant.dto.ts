import type { ConfiguracaoRabbitMqTenant } from '../../domain/entities/configuracao-rabbitmq-tenant.js';

/**
 * Saída da configuração RabbitMQ. A senha NUNCA é devolvida — apenas um flag
 * indicando que existe uma cifrada (mesma postura de segurança do TenantDatabase,
 * cuja senha também não é exposta).
 */
export interface ConfiguracaoRabbitMqTenantDTO {
  idTenantRabbitMq: string;
  tenantId: string;
  host: string;
  porta: number;
  virtualHost: string;
  usuario: string;
  sslHabilitado: boolean;
  senhaConfigurada: boolean;
}

export function paraConfiguracaoRabbitMqTenantDTO(
  config: ConfiguracaoRabbitMqTenant,
): ConfiguracaoRabbitMqTenantDTO {
  return {
    idTenantRabbitMq: config.idTenantRabbitMq,
    tenantId: config.tenantId,
    host: config.host,
    porta: config.porta,
    virtualHost: config.virtualHost,
    usuario: config.usuario,
    sslHabilitado: config.sslHabilitado,
    senhaConfigurada: config.senhaCifrada.valor.length > 0,
  };
}
