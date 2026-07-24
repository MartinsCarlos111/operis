import type { PrismaClient, Permissao as PermissaoRow } from '@prisma/client';
import { Permissao } from '../../domain/entities/permissao.js';
import { ChavePermissao } from '../../domain/value-objects/chave-permissao.js';
import type { PermissaoRepository } from '../../domain/repositories/permissao.repository.js';

function paraDominio(row: PermissaoRow): Permissao {
  return Permissao.restaurar({
    idPermissao: row.idPermissao,
    chave: ChavePermissao.criar(row.chave),
    descricao: row.descricao,
    criadoEm: row.criadoEm,
  });
}

export class PrismaPermissaoRepository implements PermissaoRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listarTodas(): Promise<Permissao[]> {
    const rows = await this.prisma.permissao.findMany({ orderBy: { chave: 'asc' } });
    return rows.map(paraDominio);
  }

  async buscarPorIds(ids: string[]): Promise<Permissao[]> {
    const rows = await this.prisma.permissao.findMany({
      where: { idPermissao: { in: ids } },
    });
    return rows.map(paraDominio);
  }

  async salvar(permissao: Permissao): Promise<void> {
    // O grupo é derivado da chave no domínio; persistimos denormalizado para
    // consultas/agrupamentos no catálogo.
    await this.prisma.permissao.upsert({
      where: { idPermissao: permissao.idPermissao },
      create: {
        idPermissao: permissao.idPermissao,
        chave: permissao.chave.valor,
        grupo: permissao.grupo,
        descricao: permissao.descricao,
        criadoEm: permissao.criadoEm,
      },
      update: { descricao: permissao.descricao },
    });
  }
}
