import type { ConfiguracaoMinioTenant } from '../../domain/entities/configuracao-minio-tenant.js';

/**
 * Saída da configuração MinIO. O secret NUNCA é devolvido — apenas um flag
 * indicando que existe um cifrado (mesma postura do TenantRabbitMq/TenantSmtp).
 */
export interface ConfiguracaoMinioTenantDTO {
  idTenantMinio: string;
  tenantId: string;
  host: string;
  porta: number;
  bucket: string;
  accessKey: string;
  sslHabilitado: boolean;
  pathStyleAccess: boolean;
  secretKeyConfigurada: boolean;
}

export function paraConfiguracaoMinioTenantDTO(
  config: ConfiguracaoMinioTenant,
): ConfiguracaoMinioTenantDTO {
  return {
    idTenantMinio: config.idTenantMinio,
    tenantId: config.tenantId,
    host: config.host,
    porta: config.porta,
    bucket: config.bucket,
    accessKey: config.accessKey,
    sslHabilitado: config.sslHabilitado,
    pathStyleAccess: config.pathStyleAccess,
    secretKeyConfigurada: config.secretKeyCifrada.valor.length > 0,
  };
}
