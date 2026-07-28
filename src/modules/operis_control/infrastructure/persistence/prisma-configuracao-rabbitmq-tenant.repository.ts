import type { PrismaClient } from '@prisma/client';
import { ConfiguracaoRabbitMqTenant } from '../../domain/entities/configuracao-rabbitmq-tenant.js';
import type { ConfiguracaoRabbitMqTenantRepository } from '../../domain/repositories/configuracao-rabbitmq-tenant.repository.js';

/**
 * Adaptador Prisma da configuração RabbitMQ do tenant (1:1). A senha é
 * persistida apenas cifrada (SegredoCifrado → colunas senha_encrypted +
 * encryption_version), no mesmo padrão do TenantDatabase.
 */
export class PrismaConfiguracaoRabbitMqTenantRepository
  implements ConfiguracaoRabbitMqTenantRepository
{
  constructor(private readonly prisma: PrismaClient) {}

  async buscarPorTenant(tenantId: string): Promise<ConfiguracaoRabbitMqTenant | null> {
    const row = await this.prisma.tenantRabbitMq.findUnique({ where: { tenantId } });
    if (!row) return null;
    return ConfiguracaoRabbitMqTenant.restaurar({
      idTenantRabbitMq: row.idTenantRabbitMq,
      tenantId: row.tenantId,
      host: row.host,
      porta: row.porta,
      virtualHost: row.virtualHost,
      usuario: row.usuario,
      senhaCifrada: { valor: row.senhaEncrypted, versao: row.encryptionVersion },
      sslHabilitado: row.sslEnabled,
    });
  }

  async salvar(config: ConfiguracaoRabbitMqTenant): Promise<void> {
    const dados = {
      host: config.host,
      porta: config.porta,
      virtualHost: config.virtualHost,
      usuario: config.usuario,
      senhaEncrypted: config.senhaCifrada.valor,
      encryptionVersion: config.senhaCifrada.versao,
      sslEnabled: config.sslHabilitado,
    };
    await this.prisma.tenantRabbitMq.upsert({
      where: { tenantId: config.tenantId },
      create: {
        idTenantRabbitMq: config.idTenantRabbitMq,
        tenantId: config.tenantId,
        ...dados,
      },
      update: dados,
    });
  }
}
