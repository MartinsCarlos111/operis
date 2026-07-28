import type { ConfiguracaoRabbitMqTenantRepository } from '../../domain/repositories/configuracao-rabbitmq-tenant.repository.js';
import { TenantNaoEncontradoError } from '../../domain/exceptions/index.js';
import {
  paraConfiguracaoRabbitMqTenantDTO,
  type ConfiguracaoRabbitMqTenantDTO,
} from '../dtos/configuracao-rabbitmq-tenant.dto.js';

/**
 * Obtém a configuração RabbitMQ de um tenant (sem a senha — só metadados).
 * 404 se o tenant ainda não tem RabbitMQ configurado.
 */
export class ObterRabbitMqTenantUseCase {
  constructor(private readonly configs: ConfiguracaoRabbitMqTenantRepository) {}

  async executar(tenantId: string): Promise<ConfiguracaoRabbitMqTenantDTO> {
    const config = await this.configs.buscarPorTenant(tenantId);
    if (!config) {
      throw new TenantNaoEncontradoError(`${tenantId} (sem RabbitMQ configurado)`);
    }
    return paraConfiguracaoRabbitMqTenantDTO(config);
  }
}
