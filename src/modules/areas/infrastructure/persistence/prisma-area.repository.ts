import type { Prisma, PrismaClient } from '@prisma/client';
import type { Area } from '../../domain/entities/area.js';
import type {
  AreaRepository,
  CriterioListagemArea,
} from '../../domain/repositories/area.repository.js';
import { AreaMapper } from './area.mapper.js';

export class PrismaAreaRepository implements AreaRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Filtro de grid: no legado o `jsonConditions` virava SQL por string
   * (injeção latente). Aqui vira um `where` tipado — busca textual
   * case-insensitive sobre código/descrição, sempre escopada ao
   * estabelecimento ativo.
   */
  private montarWhere(estabelecimentoId: string, termo?: string): Prisma.AreaWhereInput {
    const where: Prisma.AreaWhereInput = { estabelecimentoId };
    const limpo = termo?.trim();
    if (limpo) {
      where.OR = [
        { codigo: { contains: limpo, mode: 'insensitive' } },
        { descricao: { contains: limpo, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  async buscarPorId(idArea: string, estabelecimentoId: string): Promise<Area | null> {
    // Escopo por estabelecimento: um id de outro tenant/estabelecimento não
    // vaza (paridade com o filtro implícito de EstabelecimentoExecution).
    const row = await this.prisma.area.findFirst({ where: { idArea, estabelecimentoId } });
    return row ? AreaMapper.paraDominio(row) : null;
  }

  async buscarPorCodigo(codigo: string, estabelecimentoId: string): Promise<Area | null> {
    const row = await this.prisma.area.findUnique({
      where: { estabelecimentoId_codigo: { estabelecimentoId, codigo } },
    });
    return row ? AreaMapper.paraDominio(row) : null;
  }

  async listar(criterio: CriterioListagemArea): Promise<Area[]> {
    const rows = await this.prisma.area.findMany({
      where: this.montarWhere(criterio.estabelecimentoId, criterio.termo),
      orderBy: { codigo: 'asc' },
      skip: criterio.startIndex,
      take: criterio.maxRows,
    });
    return rows.map(AreaMapper.paraDominio);
  }

  async contar(estabelecimentoId: string, termo?: string): Promise<number> {
    return this.prisma.area.count({ where: this.montarWhere(estabelecimentoId, termo) });
  }

  async salvar(area: Area): Promise<void> {
    const data = AreaMapper.paraPersistencia(area);
    await this.prisma.area.upsert({
      where: { idArea: data.idArea },
      create: data,
      update: {
        codigo: data.codigo,
        descricao: data.descricao,
        atualizadoEm: data.atualizadoEm,
      },
    });
  }

  async excluir(idArea: string): Promise<void> {
    await this.prisma.area.delete({ where: { idArea } });
  }

  async contarUsuariosVinculados(idArea: string): Promise<number> {
    return this.prisma.areaUsuario.count({ where: { areaId: idArea } });
  }
}
