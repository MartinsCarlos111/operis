import type { ConfiguracaoMinioTenant } from '../entities/configuracao-minio-tenant.js';

/** Port da configuração MinIO de um tenant (1:1). `salvar` é upsert. */
export interface ConfiguracaoMinioTenantRepository {
  buscarPorTenant(tenantId: string): Promise<ConfiguracaoMinioTenant | null>;
  salvar(config: ConfiguracaoMinioTenant): Promise<void>;
}
