import type { SegredoCifrado } from '../gateways/encryption-service.js';

interface ConfiguracaoRabbitMqTenantProps {
  idTenantRabbitMq: string;
  tenantId: string;
  host: string;
  porta: number;
  virtualHost: string;
  usuario: string;
  /** Senha SEMPRE cifrada (AES-256-GCM). Texto puro nunca entra no domínio persistido. */
  senhaCifrada: SegredoCifrado;
  sslHabilitado: boolean;
}

/**
 * Configuração do broker RabbitMQ dedicado de um tenant (Control Plane).
 * Espelha ConfiguracaoBancoTenant: guarda a senha apenas cifrada; quem decifra
 * é o EncryptionService, e somente no momento de abrir a conexão real.
 */
export class ConfiguracaoRabbitMqTenant {
  private constructor(private props: ConfiguracaoRabbitMqTenantProps) {}

  static criar(input: {
    idTenantRabbitMq: string;
    tenantId: string;
    host: string;
    porta: number;
    usuario: string;
    senhaCifrada: SegredoCifrado;
    virtualHost?: string | undefined;
    sslHabilitado?: boolean | undefined;
  }): ConfiguracaoRabbitMqTenant {
    if (input.porta < 1 || input.porta > 65535) {
      throw new Error('Porta do RabbitMQ fora do intervalo válido (1–65535)');
    }
    if (input.host.trim().length === 0) {
      throw new Error('Host do RabbitMQ é obrigatório');
    }
    return new ConfiguracaoRabbitMqTenant({
      idTenantRabbitMq: input.idTenantRabbitMq,
      tenantId: input.tenantId,
      host: input.host.trim(),
      porta: input.porta,
      virtualHost: (input.virtualHost ?? '/').trim() || '/',
      usuario: input.usuario.trim(),
      senhaCifrada: input.senhaCifrada,
      sslHabilitado: input.sslHabilitado ?? false,
    });
  }

  static restaurar(props: ConfiguracaoRabbitMqTenantProps): ConfiguracaoRabbitMqTenant {
    return new ConfiguracaoRabbitMqTenant(props);
  }

  get idTenantRabbitMq(): string {
    return this.props.idTenantRabbitMq;
  }
  get tenantId(): string {
    return this.props.tenantId;
  }
  get host(): string {
    return this.props.host;
  }
  get porta(): number {
    return this.props.porta;
  }
  get virtualHost(): string {
    return this.props.virtualHost;
  }
  get usuario(): string {
    return this.props.usuario;
  }
  get senhaCifrada(): SegredoCifrado {
    return this.props.senhaCifrada;
  }
  get sslHabilitado(): boolean {
    return this.props.sslHabilitado;
  }
}
