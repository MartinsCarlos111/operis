import { Prisma, type PrismaClient, type CalculoIndicadores as CalculoIndicadoresRow } from '@prisma/client';
import { CalculoIndicadores } from '../../domain/entities/calculo-indicadores.js';
import { MovimentoCalculoIndicadores } from '../../domain/entities/movimento-calculo-indicadores.js';
import type {
  CalculoIndicadoresRepository,
  CriterioListagemCalculoIndicadores,
} from '../../domain/repositories/calculo-indicadores.repositories.js';

const inicioDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const CalculoIndicadoresMapper = {
  paraDominio(row: CalculoIndicadoresRow): CalculoIndicadores {
    return CalculoIndicadores.restaurar({
      idCalculoIndicadores: row.idCalculoIndicadores,
      estabelecimentoId: row.estabelecimentoId,
      centroTrabalhoId: row.centroTrabalhoId,
      turnoId: row.turnoId,
      diaTurno: row.diaTurno,
      qtdProduzida: row.qtdProduzida,
      qtdRefugo: row.qtdRefugo,
      qtdPerda: row.qtdPerda,
      qtdMeta: row.qtdMeta,
      tempoProducaoSeg: row.tempoProducao,
      tempoParadaSeg: row.tempoParada,
      tempoPreparacaoSeg: row.tempoPreparacao,
      tempoDisponivelSeg: row.tempoDisponivel,
      tempoTotalSeg: row.tempoTotal,
      tempoManutencaoSeg: row.tempoManutencao,
      disponibilidade: row.disponibilidade,
      eficiencia: row.eficiencia,
      qualidade: row.qualidade,
      oee: row.oee,
      teep: row.teep,
      perdaFinanceira: row.perdaFinanceira,
      custoMaquinaHora: row.custoMaquinaHora,
      recalcular: row.recalcular,
      ultimaAtualizacao: row.ultimaAtualizacao,
    });
  },
};

export class PrismaCalculoIndicadoresRepository implements CalculoIndicadoresRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private where(c: CriterioListagemCalculoIndicadores): Prisma.CalculoIndicadoresWhereInput {
    return {
      estabelecimentoId: c.estabelecimentoId,
      ...(c.centroTrabalhoId ? { centroTrabalhoId: c.centroTrabalhoId } : {}),
      ...(c.turnoId ? { turnoId: c.turnoId } : {}),
      ...(c.dataInicio || c.dataFim
        ? {
            diaTurno: {
              ...(c.dataInicio ? { gte: inicioDia(c.dataInicio) } : {}),
              ...(c.dataFim ? { lt: inicioDia(c.dataFim) } : {}),
            },
          }
        : {}),
    };
  }

  async buscarPorChave(
    centroTrabalhoId: string,
    turnoId: string | null,
    diaTurno: Date,
  ): Promise<CalculoIndicadores | null> {
    // Prisma exige `turnoId: null` no `where` composto — nome unico aceita.
    const row = await this.prisma.calculoIndicadores.findFirst({
      where: { centroTrabalhoId, turnoId, diaTurno: inicioDia(diaTurno) },
    });
    return row ? CalculoIndicadoresMapper.paraDominio(row) : null;
  }

  async buscarPorId(id: string): Promise<CalculoIndicadores | null> {
    const row = await this.prisma.calculoIndicadores.findUnique({ where: { idCalculoIndicadores: id } });
    return row ? CalculoIndicadoresMapper.paraDominio(row) : null;
  }

  async listar(criterio: CriterioListagemCalculoIndicadores): Promise<CalculoIndicadores[]> {
    const rows = await this.prisma.calculoIndicadores.findMany({
      where: this.where(criterio),
      orderBy: { diaTurno: 'desc' },
      skip: criterio.startIndex,
      take: criterio.maxRows,
    });
    return rows.map((r) => CalculoIndicadoresMapper.paraDominio(r));
  }

  async contar(criterio: CriterioListagemCalculoIndicadores): Promise<number> {
    return this.prisma.calculoIndicadores.count({ where: this.where(criterio) });
  }

  async salvar(
    calculo: CalculoIndicadores,
    detalhes: ReadonlyArray<MovimentoCalculoIndicadores>,
  ): Promise<void> {
    const data = {
      estabelecimentoId: calculo.estabelecimentoId,
      centroTrabalhoId: calculo.centroTrabalhoId,
      turnoId: calculo.turnoId,
      diaTurno: inicioDia(calculo.diaTurno),
      qtdProduzida: calculo.qtdProduzida,
      qtdRefugo: calculo.qtdRefugo,
      qtdPerda: calculo.qtdPerda,
      qtdMeta: calculo.qtdMeta,
      tempoProducao: calculo.tempoProducaoSeg,
      tempoParada: calculo.tempoParadaSeg,
      tempoPreparacao: calculo.tempoPreparacaoSeg,
      tempoDisponivel: calculo.tempoDisponivelSeg,
      tempoTotal: calculo.tempoTotalSeg,
      tempoManutencao: calculo.tempoManutencaoSeg,
      disponibilidade: calculo.disponibilidade,
      eficiencia: calculo.eficiencia,
      qualidade: calculo.qualidade,
      oee: calculo.oee,
      teep: calculo.teep,
      perdaFinanceira: calculo.perdaFinanceira,
      custoMaquinaHora: calculo.custoMaquinaHora,
      recalcular: calculo.recalcular,
      ultimaAtualizacao: calculo.ultimaAtualizacao,
    };
    await this.prisma.$transaction(async (tx) => {
      await tx.movimentoCalculoIndicadores.deleteMany({
        where: { calculoIndicadoresId: calculo.idCalculoIndicadores },
      });
      await tx.calculoIndicadores.upsert({
        where: { idCalculoIndicadores: calculo.idCalculoIndicadores },
        create: { idCalculoIndicadores: calculo.idCalculoIndicadores, ...data },
        update: data,
      });
      if (detalhes.length > 0) {
        await tx.movimentoCalculoIndicadores.createMany({
          data: detalhes.map((d) => ({
            idMovimentoCalculoIndicadores: d.idMovimentoCalculoIndicadores,
            calculoIndicadoresId: d.calculoIndicadoresId,
            movimentoId: d.movimentoId,
            quantidade: d.quantidade,
            tempoSegundos: d.tempoSegundos,
            tipo: d.tipo,
            consideraOee: d.consideraOee,
            cicloPadraoOrdem: d.cicloPadraoOrdem,
            custoMaquinaHora: d.custoMaquinaHora,
            recalcular: d.recalcular,
          })),
          skipDuplicates: true,
        });
      }
    });
  }
}