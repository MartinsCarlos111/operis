import type { ConfiguracaoRabbitMqTenant } from '../entities/configuracao-rabbitmq-tenant.js';

/** Port da configuração RabbitMQ de um tenant (1:1). `salvar` é upsert. */
export interface ConfiguracaoRabbitMqTenantRepository {
  buscarPorTenant(tenantId: string): Promise<ConfiguracaoRabbitMqTenant | null>;
  salvar(config: ConfiguracaoRabbitMqTenant): Promise<void>;
}
