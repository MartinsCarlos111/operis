import type { SegredoCifrado } from '../gateways/encryption-service.js';
import { StatusConexao } from '../value-objects/status-conexao.js';

interface ConfiguracaoBancoTenantProps {
  idTenantDatabase: string;
  provider: string;
  host: string;
  porta: number;
  nomeBanco: string;
  usuario: string;
  /** Senha SEMPRE cifrada (AES-256-GCM). Texto puro nunca entra no domínio persistido. */
  senhaCifrada: SegredoCifrado;
  sslHabilitado: boolean;
  statusConexao: StatusConexao;
  ultimaConexaoEm: Date | null;
}

/**
 * Configuração do banco dedicado de um tenant — parte do agregado Tenant
 * (nunca manipulada fora dele). Guarda a senha apenas cifrada; quem decifra é
 * o EncryptionService, e somente no momento de abrir a conexão real.
 */
export class ConfiguracaoBancoTenant {
  private constructor(private props: ConfiguracaoBancoTenantProps) {}

  static criar(input: {
    idTenantDatabase: string;
    host: string;
    porta: number;
    nomeBanco: string;
    usuario: string;
    senhaCifrada: SegredoCifrado;
    sslHabilitado?: boolean | undefined;
    provider?: string | undefined;
  }): ConfiguracaoBancoTenant {
    if (input.porta < 1 || input.porta > 65535) {
      throw new Error('Porta do banco fora do intervalo válido (1–65535)');
    }
    if (input.host.trim().length === 0 || input.nomeBanco.trim().length === 0) {
      throw new Error('Host e nome do banco são obrigatórios');
    }
    return new ConfiguracaoBancoTenant({
      idTenantDatabase: input.idTenantDatabase,
      provider: input.provider ?? 'postgresql',
      host: input.host.trim(),
      porta: input.porta,
      nomeBanco: input.nomeBanco.trim(),
      usuario: input.usuario.trim(),
      senhaCifrada: input.senhaCifrada,
      sslHabilitado: input.sslHabilitado ?? true,
      statusConexao: StatusConexao.PROVISIONANDO,
      ultimaConexaoEm: null,
    });
  }

  static restaurar(props: ConfiguracaoBancoTenantProps): ConfiguracaoBancoTenant {
    return new ConfiguracaoBancoTenant(props);
  }

  get idTenantDatabase(): string {
    return this.props.idTenantDatabase;
  }

  get provider(): string {
    return this.props.provider;
  }

  get host(): string {
    return this.props.host;
  }

  get porta(): number {
    return this.props.porta;
  }

  get nomeBanco(): string {
    return this.props.nomeBanco;
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

  get statusConexao(): StatusConexao {
    return this.props.statusConexao;
  }

  get ultimaConexaoEm(): Date | null {
    return this.props.ultimaConexaoEm;
  }

  registrarConexaoBemSucedida(): void {
    this.props.statusConexao = StatusConexao.ONLINE;
    this.props.ultimaConexaoEm = new Date();
  }

  registrarFalhaConexao(): void {
    this.props.statusConexao = StatusConexao.ERRO;
  }

  marcarOffline(): void {
    this.props.statusConexao = StatusConexao.OFFLINE;
  }

  /** Troca as credenciais — exige nova cifragem antes (nunca aceita texto puro). */
  atualizarCredenciais(usuario: string, senhaCifrada: SegredoCifrado): void {
    this.props.usuario = usuario.trim();
    this.props.senhaCifrada = senhaCifrada;
    this.props.statusConexao = StatusConexao.PROVISIONANDO;
  }
}
