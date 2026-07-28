import type { PrismaClient } from '@prisma/client';
import type { EstabelecimentoImpressora } from '../../domain/entities/estabelecimento-impressora.js';
import type { EstabelecimentoImpressoraRepository } from '../../domain/repositories/estabelecimento-impressora.repository.js';
import { EstabelecimentoImpressoraMapper } from './estabelecimento-impressora.mapper.js';

export class PrismaEstabelecimentoImpressoraRepository
  implements EstabelecimentoImpressoraRepository
{
  constructor(private readonly prisma: PrismaClient) {}

  async buscar(
    estabelecimentoId: string,
    impressoraId: string,
  ): Promise<EstabelecimentoImpressora | null> {
    const row = await this.prisma.estabelecimentoImpressora.findUnique({
      where: { estabelecimentoId_impressoraId: { estabelecimentoId, impressoraId } },
    });
    return row ? EstabelecimentoImpressoraMapper.paraDominio(row) : null;
  }

  async listarPorEstabelecimento(estabelecimentoId: string): Promise<EstabelecimentoImpressora[]> {
    const rows = await this.prisma.estabelecimentoImpressora.findMany({
      where: { estabelecimentoId },
      orderBy: { criadoEm: 'asc' },
    });
    return rows.map(EstabelecimentoImpressoraMapper.paraDominio);
  }

  async listarPorImpressora(impressoraId: string): Promise<EstabelecimentoImpressora[]> {
    const rows = await this.prisma.estabelecimentoImpressora.findMany({
      where: { impressoraId },
      orderBy: { criadoEm: 'asc' },
    });
    return rows.map(EstabelecimentoImpressoraMapper.paraDominio);
  }

  async salvar(vinculo: EstabelecimentoImpressora): Promise<void> {
    const data = EstabelecimentoImpressoraMapper.paraPersistencia(vinculo);
    await this.prisma.estabelecimentoImpressora.upsert({
      where: {
        estabelecimentoId_impressoraId: {
          estabelecimentoId: data.estabelecimentoId,
          impressoraId: data.impressoraId,
        },
      },
      create: data,
      update: {},
    });
  }

  async excluir(estabelecimentoId: string, impressoraId: string): Promise<void> {
    await this.prisma.estabelecimentoImpressora.delete({
      where: { estabelecimentoId_impressoraId: { estabelecimentoId, impressoraId } },
    });
  }
}
