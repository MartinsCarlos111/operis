import type { PrismaClient, UsuarioEstabelecimento as VinculoRow } from '@prisma/client';
import { UsuarioEstabelecimento } from '../../domain/entities/usuario-estabelecimento.js';
import type { UsuarioEstabelecimentoRepository } from '../../domain/repositories/usuario-estabelecimento.repository.js';

function paraDominio(row: VinculoRow): UsuarioEstabelecimento {
  return UsuarioEstabelecimento.restaurar({
    usuarioId: row.usuarioId,
    estabelecimentoId: row.estabelecimentoId,
    nivelAcessoId: row.nivelAcessoId,
    status: row.status,
    criadoEm: row.criadoEm,
    atualizadoEm: row.atualizadoEm,
  });
}

export class PrismaUsuarioEstabelecimentoRepository implements UsuarioEstabelecimentoRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async buscar(usuarioId: string, estabelecimentoId: string): Promise<UsuarioEstabelecimento | null> {
    const row = await this.prisma.usuarioEstabelecimento.findUnique({
      where: { usuarioId_estabelecimentoId: { usuarioId, estabelecimentoId } },
    });
    return row ? paraDominio(row) : null;
  }

  async listarPorUsuario(usuarioId: string): Promise<UsuarioEstabelecimento[]> {
    const rows = await this.prisma.usuarioEstabelecimento.findMany({
      where: { usuarioId },
    });
    return rows.map(paraDominio);
  }

  async salvar(vinculo: UsuarioEstabelecimento): Promise<void> {
    await this.prisma.usuarioEstabelecimento.upsert({
      where: {
        usuarioId_estabelecimentoId: {
          usuarioId: vinculo.usuarioId,
          estabelecimentoId: vinculo.estabelecimentoId,
        },
      },
      create: {
        usuarioId: vinculo.usuarioId,
        estabelecimentoId: vinculo.estabelecimentoId,
        nivelAcessoId: vinculo.nivelAcessoId,
        status: vinculo.status,
        criadoEm: vinculo.criadoEm,
        atualizadoEm: vinculo.atualizadoEm,
      },
      update: {
        nivelAcessoId: vinculo.nivelAcessoId,
        status: vinculo.status,
        atualizadoEm: vinculo.atualizadoEm,
      },
    });
  }
}
