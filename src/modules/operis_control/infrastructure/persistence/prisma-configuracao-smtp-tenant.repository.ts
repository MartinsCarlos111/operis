import type { PrismaClient } from '@prisma/client';
import { ConfiguracaoSmtpTenant } from '../../domain/entities/configuracao-smtp-tenant.js';
import type { ConfiguracaoSmtpTenantRepository } from '../../domain/repositories/configuracao-smtp-tenant.repository.js';

/**
 * Adaptador Prisma da configuração SMTP do tenant (1:1). A senha é persistida
 * apenas cifrada, no mesmo padrão do TenantDatabase.
 */
export class PrismaConfiguracaoSmtpTenantRepository implements ConfiguracaoSmtpTenantRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async buscarPorTenant(tenantId: string): Promise<ConfiguracaoSmtpTenant | null> {
    const row = await this.prisma.tenantSmtp.findUnique({ where: { tenantId } });
    if (!row) return null;
    return ConfiguracaoSmtpTenant.restaurar({
      idTenantSmtp: row.idTenantSmtp,
      tenantId: row.tenantId,
      host: row.host,
      porta: row.porta,
      usuario: row.usuario,
      remetente: row.remetente,
      senhaCifrada: { valor: row.senhaEncrypted, versao: row.encryptionVersion },
      sslHabilitado: row.sslEnabled,
    });
  }

  async salvar(config: ConfiguracaoSmtpTenant): Promise<void> {
    const dados = {
      host: config.host,
      porta: config.porta,
      usuario: config.usuario,
      remetente: config.remetente,
      senhaEncrypted: config.senhaCifrada.valor,
      encryptionVersion: config.senhaCifrada.versao,
      sslEnabled: config.sslHabilitado,
    };
    await this.prisma.tenantSmtp.upsert({
      where: { tenantId: config.tenantId },
      create: {
        idTenantSmtp: config.idTenantSmtp,
        tenantId: config.tenantId,
        ...dados,
      },
      update: dados,
    });
  }
}
