import { ConfiguracaoSmtpTenant } from '../../domain/entities/configuracao-smtp-tenant.js';
import type { ConfiguracaoSmtpTenantRepository } from '../../domain/repositories/configuracao-smtp-tenant.repository.js';
import type { TenantRepository } from '../../domain/repositories/tenant.repository.js';
import type { EncryptionService } from '../../domain/gateways/encryption-service.js';
import type { GeradorId } from '@shared/domain/gerador-id.js';
import { TenantNaoEncontradoError } from '../../domain/exceptions/index.js';
import {
  paraConfiguracaoSmtpTenantDTO,
  type ConfiguracaoSmtpTenantDTO,
} from '../dtos/configuracao-smtp-tenant.dto.js';

export interface ConfigurarSmtpTenantInput {
  tenantId: string;
  host: string;
  porta: number;
  usuario: string;
  /** Texto puro — só existe em memória até a cifragem, nunca persistido assim. */
  senha: string;
  remetente?: string | undefined;
  sslHabilitado?: boolean | undefined;
}

/**
 * Cria ou atualiza (upsert) a configuração SMTP de um tenant. Valida que o
 * tenant existe → cifra a senha → salva.
 */
export class ConfigurarSmtpTenantUseCase {
  constructor(
    private readonly configs: ConfiguracaoSmtpTenantRepository,
    private readonly tenants: TenantRepository,
    private readonly encryption: EncryptionService,
    private readonly ids: GeradorId,
  ) {}

  async executar(input: ConfigurarSmtpTenantInput): Promise<ConfiguracaoSmtpTenantDTO> {
    const tenant = await this.tenants.buscarPorId(input.tenantId);
    if (!tenant) {
      throw new TenantNaoEncontradoError(input.tenantId);
    }

    const existente = await this.configs.buscarPorTenant(input.tenantId);
    const senhaCifrada = this.encryption.cifrar(input.senha);

    const config = ConfiguracaoSmtpTenant.criar({
      idTenantSmtp: existente?.idTenantSmtp ?? this.ids.gerar(),
      tenantId: input.tenantId,
      host: input.host,
      porta: input.porta,
      usuario: input.usuario,
      senhaCifrada,
      remetente: input.remetente,
      sslHabilitado: input.sslHabilitado,
    });

    await this.configs.salvar(config);
    return paraConfiguracaoSmtpTenantDTO(config);
  }
}
