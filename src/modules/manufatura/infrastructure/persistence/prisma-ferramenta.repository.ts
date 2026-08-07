import type { Ferramenta as FerramentaRow, Prisma, PrismaClient } from '@prisma/client';
import { Ferramenta } from '../../domain/entities/ferramenta.js';
import type {
  CriterioListagemFerramenta,
  FerramentaRepository,
} from '../../domain/repositories/ferramenta.repositories.js';

export const FerramentaMapper = {
  paraDominio(row: FerramentaRow): Ferramenta {
    return Ferramenta.restaurar({
      idFerramenta: row.idFerramenta,
      codigo: row.codigo,
      descricao: row.descricao,
      vidaUtilUnidade: row.vidaUtilUnidade ? row.vidaUtilUnidade.toNumber() : null,
      vidaUtilSegundos: row.vidaUtilSegundos,
      status: row.status,
      estabelecimentoId: row.estabelecimentoId,
    });
  },
};

export class PrismaFerramentaRepository implements FerramentaRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private where(c: CriterioListagemFerramenta): Prisma.FerramentaWhereInput {
    return {
      estabelecimentoId: c.estabelecimentoId,
      ...(c.termo
        ? {
            OR: [
              { codigo: { contains: c.termo, mode: 'insensitive' } },
              { descricao: { contains: c.termo, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  async buscarPorId(id: string, estabelecimentoId: string): Promise<Ferramenta | null> {
    const row = await this.prisma.ferramenta.findFirst({
      where: { idFerramenta: id, estabelecimentoId },
    });
    return row ? FerramentaMapper.paraDominio(row) : null;
  }

  async buscarPorCodigo(codigo: string, estabelecimentoId: string): Promise<Ferramenta | null> {
    const row = await this.prisma.ferramenta.findUnique({
      where: { estabelecimentoId_codigo: { estabelecimentoId, codigo } },
    });
    return row ? FerramentaMapper.paraDominio(row) : null;
  }

  async listar(criterio: CriterioListagemFerramenta): Promise<Ferramenta[]> {
    const rows = await this.prisma.ferramenta.findMany({
      where: this.where(criterio),
      orderBy: { codigo: 'asc' },
      skip: criterio.startIndex,
      take: criterio.maxRows,
    });
    return rows.map((r) => FerramentaMapper.paraDominio(r));
  }

  async contar(criterio: CriterioListagemFerramenta): Promise<number> {
    return this.prisma.ferramenta.count({ where: this.where(criterio) });
  }

  async salvar(f: Ferramenta): Promise<void> {
    const data = {
      idFerramenta: f.idFerramenta,
      codigo: f.codigo,
      descricao: f.descricao,
      vidaUtilUnidade: f.vidaUtilUnidade,
      vidaUtilSegundos: f.vidaUtilSegundos,
      status: f.status,
      estabelecimentoId: f.estabelecimentoId,
    };
    const { idFerramenta: _id, ...mutaveis } = data;
    void _id;
    await this.prisma.ferramenta.upsert({
      where: { idFerramenta: data.idFerramenta },
      create: data,
      update: mutaveis,
    });
  }

  async excluir(id: string): Promise<void> {
    await this.prisma.ferramenta.delete({ where: { idFerramenta: id } });
  }
}