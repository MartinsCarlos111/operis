import { ConfiguracaoMinioTenant } from '../../domain/entities/configuracao-minio-tenant.js';
import type { ConfiguracaoMinioTenantRepository } from '../../domain/repositories/configuracao-minio-tenant.repository.js';
import type { TenantRepository } from '../../domain/repositories/tenant.repository.js';
import type { EncryptionService } from '../../domain/gateways/encryption-service.js';
import type { GeradorId } from '@shared/domain/gerador-id.js';
import { TenantNaoEncontradoError } from '../../domain/exceptions/index.js';
import {
  paraConfiguracaoMinioTenantDTO,
  type ConfiguracaoMinioTenantDTO,
} from '../dtos/configuracao-minio-tenant.dto.js';

export interface ConfigurarMinioTenantInput {
  tenantId: string;
  host: string;
  porta: number;
  bucket: string;
  accessKey: string;
  /** Texto puro — só existe em memória até a cifragem, nunca persistido assim. */
  secretKey: string;
  sslHabilitado?: boolean | undefined;
  pathStyleAccess?: boolean | undefined;
}

/**
 * Cria ou atualiza (upsert) a configuração MinIO de um tenant. Espelha o
 * fluxo do ConfigurarRabbitMqTenant: valida que o tenant existe → cifra o
 * secret → salva.
 */
export class ConfigurarMinioTenantUseCase {
  constructor(
    private readonly configs: ConfiguracaoMinioTenantRepository,
    private readonly tenants: TenantRepository,
    private readonly encryption: EncryptionService,
    private readonly ids: GeradorId,
  ) {}

  async executar(input: ConfigurarMinioTenantInput): Promise<ConfiguracaoMinioTenantDTO> {
    const tenant = await this.tenants.buscarPorId(input.tenantId);
    if (!tenant) {
      throw new TenantNaoEncontradoError(input.tenantId);
    }

    // Preserva o id existente no upsert (mantém a linha 1:1 estável).
    const existente = await this.configs.buscarPorTenant(input.tenantId);
    const secretKeyCifrada = this.encryption.cifrar(input.secretKey);

    const config = ConfiguracaoMinioTenant.criar({
      idTenantMinio: existente?.idTenantMinio ?? this.ids.gerar(),
      tenantId: input.tenantId,
      host: input.host,
      porta: input.porta,
      bucket: input.bucket,
      accessKey: input.accessKey,
      secretKeyCifrada,
      sslHabilitado: input.sslHabilitado,
      pathStyleAccess: input.pathStyleAccess,
    });

    await this.configs.salvar(config);
    return paraConfiguracaoMinioTenantDTO(config);
  }
}
