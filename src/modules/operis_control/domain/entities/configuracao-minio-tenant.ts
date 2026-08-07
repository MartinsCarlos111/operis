import type { SegredoCifrado } from '../gateways/encryption-service.js';

interface ConfiguracaoMinioTenantProps {
  idTenantMinio: string;
  tenantId: string;
  host: string;
  porta: number;
  bucket: string;
  accessKey: string;
  /** Secret key SEMPRE cifrada (AES-256-GCM). Texto puro nunca entra no domínio persistido. */
  secretKeyCifrada: SegredoCifrado;
  sslHabilitado: boolean;
  pathStyleAccess: boolean;
}

/**
 * Configuração de object storage S3-compatível (MinIO) dedicado de um tenant
 * (Control Plane). Espelha ConfiguracaoRabbitMqTenant: guarda o secret apenas
 * cifrado; quem decifra é o EncryptionService, e somente no momento de montar
 * o cliente S3 real. Usado para guardar binários de firmware IoT.
 */
export class ConfiguracaoMinioTenant {
  private constructor(private props: ConfiguracaoMinioTenantProps) {}

  static criar(input: {
    idTenantMinio: string;
    tenantId: string;
    host: string;
    porta: number;
    bucket: string;
    accessKey: string;
    secretKeyCifrada: SegredoCifrado;
    sslHabilitado?: boolean | undefined;
    pathStyleAccess?: boolean | undefined;
  }): ConfiguracaoMinioTenant {
    if (input.porta < 1 || input.porta > 65535) {
      throw new Error('Porta do MinIO fora do intervalo válido (1–65535)');
    }
    if (input.host.trim().length === 0) {
      throw new Error('Host do MinIO é obrigatório');
    }
    if (input.bucket.trim().length === 0) {
      throw new Error('Bucket do MinIO é obrigatório');
    }
    return new ConfiguracaoMinioTenant({
      idTenantMinio: input.idTenantMinio,
      tenantId: input.tenantId,
      host: input.host.trim(),
      porta: input.porta,
      bucket: input.bucket.trim(),
      accessKey: input.accessKey.trim(),
      secretKeyCifrada: input.secretKeyCifrada,
      sslHabilitado: input.sslHabilitado ?? true,
      pathStyleAccess: input.pathStyleAccess ?? true,
    });
  }

  static restaurar(props: ConfiguracaoMinioTenantProps): ConfiguracaoMinioTenant {
    return new ConfiguracaoMinioTenant(props);
  }

  get idTenantMinio(): string {
    return this.props.idTenantMinio;
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
  get bucket(): string {
    return this.props.bucket;
  }
  get accessKey(): string {
    return this.props.accessKey;
  }
  get secretKeyCifrada(): SegredoCifrado {
    return this.props.secretKeyCifrada;
  }
  get sslHabilitado(): boolean {
    return this.props.sslHabilitado;
  }
  get pathStyleAccess(): boolean {
    return this.props.pathStyleAccess;
  }
}
