import type { SegredoCifrado } from '../gateways/encryption-service.js';

interface ConfiguracaoSmtpTenantProps {
  idTenantSmtp: string;
  tenantId: string;
  host: string;
  porta: number;
  usuario: string;
  remetente: string;
  /** Senha SEMPRE cifrada (AES-256-GCM). Texto puro nunca entra no domínio persistido. */
  senhaCifrada: SegredoCifrado;
  sslHabilitado: boolean;
}

/**
 * Configuração do servidor SMTP dedicado de um tenant (Control Plane).
 * Espelha ConfiguracaoBancoTenant: a senha entra apenas cifrada.
 */
export class ConfiguracaoSmtpTenant {
  private constructor(private props: ConfiguracaoSmtpTenantProps) {}

  static criar(input: {
    idTenantSmtp: string;
    tenantId: string;
    host: string;
    porta: number;
    usuario: string;
    senhaCifrada: SegredoCifrado;
    remetente?: string | undefined;
    sslHabilitado?: boolean | undefined;
  }): ConfiguracaoSmtpTenant {
    if (input.porta < 1 || input.porta > 65535) {
      throw new Error('Porta do SMTP fora do intervalo válido (1–65535)');
    }
    if (input.host.trim().length === 0) {
      throw new Error('Host do SMTP é obrigatório');
    }
    return new ConfiguracaoSmtpTenant({
      idTenantSmtp: input.idTenantSmtp,
      tenantId: input.tenantId,
      host: input.host.trim(),
      porta: input.porta,
      usuario: input.usuario.trim(),
      remetente: (input.remetente ?? '').trim(),
      senhaCifrada: input.senhaCifrada,
      sslHabilitado: input.sslHabilitado ?? true,
    });
  }

  static restaurar(props: ConfiguracaoSmtpTenantProps): ConfiguracaoSmtpTenant {
    return new ConfiguracaoSmtpTenant(props);
  }

  get idTenantSmtp(): string {
    return this.props.idTenantSmtp;
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
  get usuario(): string {
    return this.props.usuario;
  }
  get remetente(): string {
    return this.props.remetente;
  }
  get senhaCifrada(): SegredoCifrado {
    return this.props.senhaCifrada;
  }
  get sslHabilitado(): boolean {
    return this.props.sslHabilitado;
  }
}
