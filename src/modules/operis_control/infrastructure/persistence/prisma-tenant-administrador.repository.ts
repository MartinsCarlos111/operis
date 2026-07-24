import type { PrismaClient, TenantAdministrador as TenantAdministradorRow } from '@prisma/client';
import { TenantAdministrador } from '../../domain/entities/tenant-administrador.js';
import { Email } from '../../domain/value-objects/email.js';
import type { TenantAdministradorRepository } from '../../domain/repositories/tenant-administrador.repository.js';

function paraDominio(row: TenantAdministradorRow): TenantAdministrador {
  return TenantAdministrador.restaurar({
    idTenantAdministrador: row.idTenantAdministrador,
    tenantId: row.tenantId,
    nome: row.nome,
    email: Email.criar(row.email),
    senhaHash: row.senhaHash,
    status: row.status,
    criadoEm: row.criadoEm,
    atualizadoEm: row.atualizadoEm,
  });
}

export class PrismaTenantAdministradorRepository implements TenantAdministradorRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async buscarPorEmail(email: Email): Promise<TenantAdministrador | null> {
    const row = await this.prisma.tenantAdministrador.findUnique({
      where: { email: email.valor },
    });
    return row ? paraDominio(row) : null;
  }

  async listarPorTenant(tenantId: string): Promise<TenantAdministrador[]> {
    const rows = await this.prisma.tenantAdministrador.findMany({
      where: { tenantId },
      orderBy: { nome: 'asc' },
    });
    return rows.map(paraDominio);
  }

  async salvar(administrador: TenantAdministrador): Promise<void> {
    await this.prisma.tenantAdministrador.upsert({
      where: { idTenantAdministrador: administrador.idTenantAdministrador },
      create: {
        idTenantAdministrador: administrador.idTenantAdministrador,
        tenantId: administrador.tenantId,
        nome: administrador.nome,
        email: administrador.email.valor,
        senhaHash: administrador.senhaHash,
        status: administrador.status,
        criadoEm: administrador.criadoEm,
        atualizadoEm: administrador.atualizadoEm,
      },
      update: {
        nome: administrador.nome,
        email: administrador.email.valor,
        senhaHash: administrador.senhaHash,
        status: administrador.status,
        atualizadoEm: administrador.atualizadoEm,
      },
    });
  }
}
