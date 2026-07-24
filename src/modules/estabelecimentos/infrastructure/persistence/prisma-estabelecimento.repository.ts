import type { PrismaClient } from '@prisma/client';
import type { Estabelecimento } from '../../domain/entities/estabelecimento.js';
import type { EstabelecimentoRepository } from '../../domain/repositories/estabelecimento.repository.js';
import { EstabelecimentoMapper } from './estabelecimento.mapper.js';

export class PrismaEstabelecimentoRepository implements EstabelecimentoRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async buscarPorId(id: string): Promise<Estabelecimento | null> {
    const row = await this.prisma.estabelecimento.findUnique({
      where: { idEstabelecimento: id },
    });
    return row ? EstabelecimentoMapper.paraDominio(row) : null;
  }

  async salvar(estabelecimento: Estabelecimento): Promise<void> {
    const data = EstabelecimentoMapper.paraPersistencia(estabelecimento);
    await this.prisma.estabelecimento.upsert({
      where: { idEstabelecimento: data.idEstabelecimento },
      create: data,
      update: {
        descricao: data.descricao,
        status: data.status,
        impressoras: data.impressoras,
        coletores: data.coletores,
        checklist: data.checklist,
        manufatura: data.manufatura,
        atualizadoEm: data.atualizadoEm,
      },
    });
  }
}
