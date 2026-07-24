import type { Tenant as TenantRow, TenantDatabase as TenantDatabaseRow } from '@prisma/client';
import { Tenant } from '../../domain/entities/tenant.js';
import { ConfiguracaoBancoTenant } from '../../domain/entities/configuracao-banco-tenant.js';
import { Slug } from '../../domain/value-objects/slug.js';

export type TenantRowComBanco = TenantRow & { database: TenantDatabaseRow | null };

export const TenantMapper = {
  paraDominio(row: TenantRowComBanco): Tenant {
    return Tenant.restaurar({
      idTenant: row.idTenant,
      nome: row.nome,
      slug: Slug.criar(row.slug),
      status: row.status,
      banco: row.database
        ? ConfiguracaoBancoTenant.restaurar({
            idTenantDatabase: row.database.idTenantDatabase,
            provider: row.database.databaseProvider,
            host: row.database.databaseHost,
            porta: row.database.databasePort,
            nomeBanco: row.database.databaseName,
            usuario: row.database.databaseUsername,
            senhaCifrada: {
              valor: row.database.databasePasswordEncrypted,
              versao: row.database.databaseEncryptionVersion,
            },
            sslHabilitado: row.database.sslEnabled,
            statusConexao: row.database.connectionStatus,
            ultimaConexaoEm: row.database.lastConnectionAt,
          })
        : null,
      criadoEm: row.criadoEm,
      atualizadoEm: row.atualizadoEm,
    });
  },
};
