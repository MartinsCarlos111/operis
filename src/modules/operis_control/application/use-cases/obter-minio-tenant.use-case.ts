import type { ConfiguracaoMinioTenantRepository } from '../../domain/repositories/configuracao-minio-tenant.repository.js';
import { TenantNaoEncontradoError } from '../../domain/exceptions/index.js';
import {
  paraConfiguracaoMinioTenantDTO,
  type ConfiguracaoMinioTenantDTO,
} from '../dtos/configuracao-minio-tenant.dto.js';

/**
 * Obtém a configuração MinIO de um tenant (sem o secret — só metadados).
 * 404 se o tenant ainda não tem MinIO configurado.
 */
export class ObterMinioTenantUseCase {
  constructor(private readonly configs: ConfiguracaoMinioTenantRepository) {}

  async executar(tenantId: string): Promise<ConfiguracaoMinioTenantDTO> {
    const config = await this.configs.buscarPorTenant(tenantId);
    if (!config) {
      throw new TenantNaoEncontradoError(`${tenantId} (sem MinIO configurado)`);
    }
    return paraConfiguracaoMinioTenantDTO(config);
  }
}
