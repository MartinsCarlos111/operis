import type { ConfiguracaoSmtpTenantRepository } from '../../domain/repositories/configuracao-smtp-tenant.repository.js';
import { TenantNaoEncontradoError } from '../../domain/exceptions/index.js';
import {
  paraConfiguracaoSmtpTenantDTO,
  type ConfiguracaoSmtpTenantDTO,
} from '../dtos/configuracao-smtp-tenant.dto.js';

/**
 * Obtém a configuração SMTP de um tenant (sem a senha). 404 se ainda não
 * configurado.
 */
export class ObterSmtpTenantUseCase {
  constructor(private readonly configs: ConfiguracaoSmtpTenantRepository) {}

  async executar(tenantId: string): Promise<ConfiguracaoSmtpTenantDTO> {
    const config = await this.configs.buscarPorTenant(tenantId);
    if (!config) {
      throw new TenantNaoEncontradoError(`${tenantId} (sem SMTP configurado)`);
    }
    return paraConfiguracaoSmtpTenantDTO(config);
  }
}
