import type { Prisma, PrismaClient } from '@prisma/client';
import type { LayoutEtiqueta } from '../../domain/entities/layout-etiqueta.js';
import type {
  LayoutEtiquetaRepository,
  CriterioListagemLayout,
} from '../../domain/repositories/layout-etiqueta.repository.js';
import { LayoutEtiquetaMapper } from './layout-etiqueta.mapper.js';

export class PrismaLayoutEtiquetaRepository implements LayoutEtiquetaRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private montarWhere(termo?: string): Prisma.LayoutEtiquetaWhereInput {
    const limpo = termo?.trim();
    if (!limpo) return {};
    return {
      OR: [
        { codigo: { contains: limpo, mode: 'insensitive' } },
        { descricao: { contains: limpo, mode: 'insensitive' } },
      ],
    };
  }

  async buscarPorId(idLayout: string): Promise<LayoutEtiqueta | null> {
    const row = await this.prisma.layoutEtiqueta.findUnique({ where: { idLayout } });
    return row ? LayoutEtiquetaMapper.paraDominio(row) : null;
  }

  async buscarPorCodigo(codigo: string): Promise<LayoutEtiqueta | null> {
    const row = await this.prisma.layoutEtiqueta.findUnique({ where: { codigo } });
    return row ? LayoutEtiquetaMapper.paraDominio(row) : null;
  }

  async listar(criterio: CriterioListagemLayout): Promise<LayoutEtiqueta[]> {
    const rows = await this.prisma.layoutEtiqueta.findMany({
      where: this.montarWhere(criterio.termo),
      orderBy: { codigo: 'asc' },
      skip: criterio.startIndex,
      take: criterio.maxRows,
    });
    return rows.map(LayoutEtiquetaMapper.paraDominio);
  }

  async contar(termo?: string): Promise<number> {
    return this.prisma.layoutEtiqueta.count({ where: this.montarWhere(termo) });
  }

  async salvar(l: LayoutEtiqueta): Promise<void> {
    const data = LayoutEtiquetaMapper.paraPersistencia(l);
    await this.prisma.layoutEtiqueta.upsert({
      where: { idLayout: data.idLayout },
      create: data,
      update: {
        codigo: data.codigo,
        descricao: data.descricao,
        zpl: data.zpl,
        atualizadoEm: data.atualizadoEm,
      },
    });
  }

  async excluir(idLayout: string): Promise<void> {
    await this.prisma.layoutEtiqueta.delete({ where: { idLayout } });
  }
}
