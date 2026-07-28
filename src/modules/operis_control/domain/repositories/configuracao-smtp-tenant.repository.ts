import type { ConfiguracaoSmtpTenant } from '../entities/configuracao-smtp-tenant.js';

/** Port da configuração SMTP de um tenant (1:1). `salvar` é upsert. */
export interface ConfiguracaoSmtpTenantRepository {
  buscarPorTenant(tenantId: string): Promise<ConfiguracaoSmtpTenant | null>;
  salvar(config: ConfiguracaoSmtpTenant): Promise<void>;
}
