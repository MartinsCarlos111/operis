import type { Prisma, PrismaClient } from '@prisma/client';
import type { VariavelLayout } from '../../domain/entities/variavel-layout.js';
import type {
  VariavelLayoutRepository,
  CriterioListagemVariavel,
} from '../../domain/repositories/variavel-layout.repository.js';
import { VariavelLayoutMapper } from './variavel-layout.mapper.js';

export class PrismaVariavelLayoutRepository implements VariavelLayoutRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private montarWhere(termo?: string): Prisma.VariavelLayoutWhereInput {
    const limpo = termo?.trim();
    if (!limpo) return {};
    return {
      OR: [
        { codigo: { contains: limpo, mode: 'insensitive' } },
        { descricao: { contains: limpo, mode: 'insensitive' } },
      ],
    };
  }

  async buscarPorId(idVariavel: string): Promise<VariavelLayout | null> {
    const row = await this.prisma.variavelLayout.findUnique({ where: { idVariavel } });
    return row ? VariavelLayoutMapper.paraDominio(row) : null;
  }

  async buscarPorCodigo(codigo: string): Promise<VariavelLayout | null> {
    const row = await this.prisma.variavelLayout.findUnique({ where: { codigo } });
    return row ? VariavelLayoutMapper.paraDominio(row) : null;
  }

  async listar(criterio: CriterioListagemVariavel): Promise<VariavelLayout[]> {
    const rows = await this.prisma.variavelLayout.findMany({
      where: this.montarWhere(criterio.termo),
      orderBy: { codigo: 'asc' },
      skip: criterio.startIndex,
      take: criterio.maxRows,
    });
    return rows.map(VariavelLayoutMapper.paraDominio);
  }

  async contar(termo?: string): Promise<number> {
    return this.prisma.variavelLayout.count({ where: this.montarWhere(termo) });
  }

  async salvar(v: VariavelLayout): Promise<void> {
    const data = VariavelLayoutMapper.paraPersistencia(v);
    await this.prisma.variavelLayout.upsert({
      where: { idVariavel: data.idVariavel },
      create: data,
      update: {
        codigo: data.codigo,
        descricao: data.descricao,
        campoEtiquetaManufatura: data.campoEtiquetaManufatura,
        campoEtiquetaColetores: data.campoEtiquetaColetores,
        atualizadoEm: data.atualizadoEm,
      },
    });
  }

  async excluir(idVariavel: string): Promise<void> {
    await this.prisma.variavelLayout.delete({ where: { idVariavel } });
  }
}
