import type { PrismaClient, SuperAdmin as SuperAdminRow } from '@prisma/client';
import { SuperAdmin } from '../../domain/entities/super-admin.js';
import { Email } from '../../domain/value-objects/email.js';
import type { SuperAdminRepository } from '../../domain/repositories/super-admin.repository.js';

function paraDominio(row: SuperAdminRow): SuperAdmin {
  return SuperAdmin.restaurar({
    idSuperAdmin: row.idSuperAdmin,
    nome: row.nome,
    email: Email.criar(row.email),
    senhaHash: row.senhaHash,
    status: row.status,
    criadoEm: row.criadoEm,
    atualizadoEm: row.atualizadoEm,
  });
}

export class PrismaSuperAdminRepository implements SuperAdminRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async buscarPorId(id: string): Promise<SuperAdmin | null> {
    const row = await this.prisma.superAdmin.findUnique({ where: { idSuperAdmin: id } });
    return row ? paraDominio(row) : null;
  }

  async buscarPorEmail(email: Email): Promise<SuperAdmin | null> {
    const row = await this.prisma.superAdmin.findUnique({ where: { email: email.valor } });
    return row ? paraDominio(row) : null;
  }

  async salvar(superAdmin: SuperAdmin): Promise<void> {
    await this.prisma.superAdmin.upsert({
      where: { idSuperAdmin: superAdmin.idSuperAdmin },
      create: {
        idSuperAdmin: superAdmin.idSuperAdmin,
        nome: superAdmin.nome,
        email: superAdmin.email.valor,
        senhaHash: superAdmin.senhaHash,
        status: superAdmin.status,
        criadoEm: superAdmin.criadoEm,
        atualizadoEm: superAdmin.atualizadoEm,
      },
      update: {
        nome: superAdmin.nome,
        email: superAdmin.email.valor,
        senhaHash: superAdmin.senhaHash,
        status: superAdmin.status,
        atualizadoEm: superAdmin.atualizadoEm,
      },
    });
  }
}
