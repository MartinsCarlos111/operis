import type { Prisma, PrismaClient } from '@prisma/client';
import type { Impressora } from '../../domain/entities/impressora.js';
import type {
  ImpressoraRepository,
  CriterioListagemImpressora,
} from '../../domain/repositories/impressora.repository.js';
import { ImpressoraMapper } from './impressora.mapper.js';

export class PrismaImpressoraRepository implements ImpressoraRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Filtro de grid: o `jsonConditions` do legado (SQL por string) vira um
   * `where` tipado — busca textual case-insensitive sobre código, descrição e
   * endereço. Impressora é global do tenant: sem escopo por estabelecimento.
   */
  private montarWhere(termo?: string): Prisma.ImpressoraWhereInput {
    const limpo = termo?.trim();
    if (!limpo) {
      return {};
    }
    return {
      OR: [
        { codigo: { contains: limpo, mode: 'insensitive' } },
        { descricao: { contains: limpo, mode: 'insensitive' } },
        { endereco: { contains: limpo, mode: 'insensitive' } },
      ],
    };
  }

  async buscarPorId(idImpressora: string): Promise<Impressora | null> {
    const row = await this.prisma.impressora.findUnique({ where: { idImpressora } });
    return row ? ImpressoraMapper.paraDominio(row) : null;
  }

  async buscarPorCodigo(codigo: string): Promise<Impressora | null> {
    const row = await this.prisma.impressora.findUnique({ where: { codigo } });
    return row ? ImpressoraMapper.paraDominio(row) : null;
  }

  async listar(criterio: CriterioListagemImpressora): Promise<Impressora[]> {
    const rows = await this.prisma.impressora.findMany({
      where: this.montarWhere(criterio.termo),
      orderBy: { codigo: 'asc' },
      skip: criterio.startIndex,
      take: criterio.maxRows,
    });
    return rows.map(ImpressoraMapper.paraDominio);
  }

  async contar(termo?: string): Promise<number> {
    return this.prisma.impressora.count({ where: this.montarWhere(termo) });
  }

  async salvar(impressora: Impressora): Promise<void> {
    const data = ImpressoraMapper.paraPersistencia(impressora);
    await this.prisma.impressora.upsert({
      where: { idImpressora: data.idImpressora },
      create: data,
      update: {
        codigo: data.codigo,
        descricao: data.descricao,
        endereco: data.endereco,
        atualizadoEm: data.atualizadoEm,
      },
    });
  }

  async excluir(idImpressora: string): Promise<void> {
    await this.prisma.impressora.delete({ where: { idImpressora } });
  }
}
