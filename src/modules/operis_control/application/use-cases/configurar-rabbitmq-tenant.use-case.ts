import { ConfiguracaoRabbitMqTenant } from '../../domain/entities/configuracao-rabbitmq-tenant.js';
import type { ConfiguracaoRabbitMqTenantRepository } from '../../domain/repositories/configuracao-rabbitmq-tenant.repository.js';
import type { TenantRepository } from '../../domain/repositories/tenant.repository.js';
import type { EncryptionService } from '../../domain/gateways/encryption-service.js';
import type { GeradorId } from '@shared/domain/gerador-id.js';
import { TenantNaoEncontradoError } from '../../domain/exceptions/index.js';
import {
  paraConfiguracaoRabbitMqTenantDTO,
  type ConfiguracaoRabbitMqTenantDTO,
} from '../dtos/configuracao-rabbitmq-tenant.dto.js';

export interface ConfigurarRabbitMqTenantInput {
  tenantId: string;
  host: string;
  porta: number;
  usuario: string;
  /** Texto puro — só existe em memória até a cifragem, nunca persistido assim. */
  senha: string;
  virtualHost?: string | undefined;
  sslHabilitado?: boolean | undefined;
}

/**
 * Cria ou atualiza (upsert) a configuração RabbitMQ de um tenant. Espelha o
 * fluxo do CriarTenant: valida que o tenant existe → cifra a senha → salva.
 */
export class ConfigurarRabbitMqTenantUseCase {
  constructor(
    private readonly configs: ConfiguracaoRabbitMqTenantRepository,
    private readonly tenants: TenantRepository,
    private readonly encryption: EncryptionService,
    private readonly ids: GeradorId,
  ) {}

  async executar(
    input: ConfigurarRabbitMqTenantInput,
  ): Promise<ConfiguracaoRabbitMqTenantDTO> {
    const tenant = await this.tenants.buscarPorId(input.tenantId);
    if (!tenant) {
      throw new TenantNaoEncontradoError(input.tenantId);
    }

    // Preserva o id existente no upsert (mantém a linha 1:1 estável).
    const existente = await this.configs.buscarPorTenant(input.tenantId);
    const senhaCifrada = this.encryption.cifrar(input.senha);

    const config = ConfiguracaoRabbitMqTenant.criar({
      idTenantRabbitMq: existente?.idTenantRabbitMq ?? this.ids.gerar(),
      tenantId: input.tenantId,
      host: input.host,
      porta: input.porta,
      usuario: input.usuario,
      senhaCifrada,
      virtualHost: input.virtualHost,
      sslHabilitado: input.sslHabilitado,
    });

    await this.configs.salvar(config);
    return paraConfiguracaoRabbitMqTenantDTO(config);
  }
}
