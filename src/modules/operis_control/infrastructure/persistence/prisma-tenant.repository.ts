import type { PrismaClient } from '@prisma/client';
import type { Tenant } from '../../domain/entities/tenant.js';
import type { Slug } from '../../domain/value-objects/slug.js';
import type { TenantRepository } from '../../domain/repositories/tenant.repository.js';
import { TenantMapper } from './tenant.mapper.js';

const INCLUIR_BANCO = { database: true } as const;

/**
 * Adaptador Prisma do agregado Tenant. `salvar` persiste tenant + configuração
 * de banco na mesma transação — são o mesmo agregado, ou salvam juntos ou nada.
 */
export class PrismaTenantRepository implements TenantRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async buscarPorId(id: string): Promise<Tenant | null> {
    const row = await this.prisma.tenant.findUnique({
      where: { idTenant: id },
      include: INCLUIR_BANCO,
    });
    return row ? TenantMapper.paraDominio(row) : null;
  }

  async buscarPorSlug(slug: Slug): Promise<Tenant | null> {
    const row = await this.prisma.tenant.findUnique({
      where: { slug: slug.valor },
      include: INCLUIR_BANCO,
    });
    return row ? TenantMapper.paraDominio(row) : null;
  }

  async listar(): Promise<Tenant[]> {
    const rows = await this.prisma.tenant.findMany({
      include: INCLUIR_BANCO,
      orderBy: { nome: 'asc' },
    });
    return rows.map(TenantMapper.paraDominio);
  }

  async salvar(tenant: Tenant): Promise<void> {
    const banco = tenant.banco;
    await this.prisma.$transaction(async (tx) => {
      await tx.tenant.upsert({
        where: { idTenant: tenant.idTenant },
        create: {
          idTenant: tenant.idTenant,
          nome: tenant.nome,
          slug: tenant.slug.valor,
          status: tenant.status,
          criadoEm: tenant.criadoEm,
          atualizadoEm: tenant.atualizadoEm,
        },
        update: {
          nome: tenant.nome,
          slug: tenant.slug.valor,
          status: tenant.status,
          atualizadoEm: tenant.atualizadoEm,
        },
      });

      if (banco) {
        await tx.tenantDatabase.upsert({
          where: { tenantId: tenant.idTenant },
          create: {
            idTenantDatabase: banco.idTenantDatabase,
            tenantId: tenant.idTenant,
            databaseProvider: banco.provider,
            databaseHost: banco.host,
            databasePort: banco.porta,
            databaseName: banco.nomeBanco,
            databaseUsername: banco.usuario,
            databasePasswordEncrypted: banco.senhaCifrada.valor,
            databaseEncryptionVersion: banco.senhaCifrada.versao,
            sslEnabled: banco.sslHabilitado,
            connectionStatus: banco.statusConexao,
            lastConnectionAt: banco.ultimaConexaoEm,
          },
          update: {
            databaseProvider: banco.provider,
            databaseHost: banco.host,
            databasePort: banco.porta,
            databaseName: banco.nomeBanco,
            databaseUsername: banco.usuario,
            databasePasswordEncrypted: banco.senhaCifrada.valor,
            databaseEncryptionVersion: banco.senhaCifrada.versao,
            sslEnabled: banco.sslHabilitado,
            connectionStatus: banco.statusConexao,
            lastConnectionAt: banco.ultimaConexaoEm,
          },
        });
      }
    });
  }
}
