import type { PrismaClient } from '@prisma/client';
import { ConfiguracaoMinioTenant } from '../../domain/entities/configuracao-minio-tenant.js';
import type { ConfiguracaoMinioTenantRepository } from '../../domain/repositories/configuracao-minio-tenant.repository.js';

/**
 * Adaptador Prisma da configuração MinIO do tenant (1:1). O secret é
 * persistido apenas cifrado (SegredoCifrado → colunas secret_key_encrypted +
 * encryption_version), no mesmo padrão do TenantRabbitMq/TenantSmtp.
 */
export class PrismaConfiguracaoMinioTenantRepository
  implements ConfiguracaoMinioTenantRepository
{
  constructor(private readonly prisma: PrismaClient) {}

  async buscarPorTenant(tenantId: string): Promise<ConfiguracaoMinioTenant | null> {
    const row = await this.prisma.tenantMinio.findUnique({ where: { tenantId } });
    if (!row) return null;
    return ConfiguracaoMinioTenant.restaurar({
      idTenantMinio: row.idTenantMinio,
      tenantId: row.tenantId,
      host: row.host,
      porta: row.porta,
      bucket: row.bucket,
      accessKey: row.accessKey,
      secretKeyCifrada: { valor: row.secretKeyEncrypted, versao: row.encryptionVersion },
      sslHabilitado: row.sslEnabled,
      pathStyleAccess: row.pathStyleAccess,
    });
  }

  async salvar(config: ConfiguracaoMinioTenant): Promise<void> {
    const dados = {
      host: config.host,
      porta: config.porta,
      bucket: config.bucket,
      accessKey: config.accessKey,
      secretKeyEncrypted: config.secretKeyCifrada.valor,
      encryptionVersion: config.secretKeyCifrada.versao,
      sslEnabled: config.sslHabilitado,
      pathStyleAccess: config.pathStyleAccess,
    };
    await this.prisma.tenantMinio.upsert({
      where: { tenantId: config.tenantId },
      create: {
        idTenantMinio: config.idTenantMinio,
        tenantId: config.tenantId,
        ...dados,
      },
      update: dados,
    });
  }
}
