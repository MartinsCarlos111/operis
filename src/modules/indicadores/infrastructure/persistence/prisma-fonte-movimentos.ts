import type { PrismaClient } from '@prisma/client';
import type { FonteMovimentos } from '../../domain/repositories/calculo-indicadores.repositories.js';

/**
 * Adaptador Prisma que lê Movimentos do banco do tenant (pertencente ao
 * módulo manufatura) para o módulo indicadores consumir — fronteira protegida:
 * o módulo indicadores só enxerga a porta `FonteMovimentos`, nunca o
 * `MovimentoRepository` do manufatura direto.
 *
 * O mapeamento cobre:
 *   - TipoMovimento (direto)
 *   - Quantidade na unidade do centro — paridade com `MovimentoFactory.GetQuantidadeMovimento`.
 *   - Tempo: duracaoSegundos quando há, else 0
 *   - consideraOee e custoMaquinaHora (do CentroTrabalho)
 */
export class PrismaFonteMovimentos implements FonteMovimentos {
  constructor(private readonly prisma: PrismaClient) {}

  async listarPorJanela(
    centroTrabalhoId: string,
    inicio: Date,
    fim: Date,
    soRecalcular: boolean,
  ) {
    const rows = await this.prisma.movimento.findMany({
      where: {
        centroTrabalhoId,
        inicio: { gte: inicio, lt: fim },
        cancelado: false,
        ...(soRecalcular
          ? { movimentosCalculoIndicadores: { some: { recalcular: true } } }
          : {}),
      },
      include: {
        centroTrabalho: {
          select: { custoMaquinaHora: true, tipoUnidadeMedida: true },
        },
      },
    });

    return rows.map((m) => ({
      movimentoId: m.idMovimento,
      turnoId: m.turnoId,
      tipo: m.tipo,
      quantidade: this.quantidadeNaUnidadeDoCentro(
        m,
        // TipoUnidadeMedida chega via join (string no schema).
        (m.centroTrabalho as unknown as { tipoUnidadeMedida: string }).tipoUnidadeMedida,
      ),
      tempoSegundos: m.duracaoSegundos ?? 0,
      consideraOee: m.consideraOee,
      cicloPadraoOrdem: 0,
      custoMaquinaHora: this.custo(m),
    }));
  }

  private custo(m: { centroTrabalho: { custoMaquinaHora: PrismaDecimalProxy } }): number {
    const v = m.centroTrabalho.custoMaquinaHora;
    return v ? v.toNumber() : 0;
  }

  private quantidadeNaUnidadeDoCentro(
    m: {
      quantidadeUnidade: PrismaDecimalProxy | null;
      quantidadeMetragem: PrismaDecimalProxy | null;
      quantidadePeso: PrismaDecimalProxy | null;
      quantidadeArea: PrismaDecimalProxy | null;
      quantidadeVolume: PrismaDecimalProxy | null;
      quantidadeEspecifica: PrismaDecimalProxy | null;
    },
    unidade: string,
  ): number {
    switch (unidade) {
      case 'UNIDADE':
        return num(m.quantidadeUnidade);
      case 'METRAGEM':
        return num(m.quantidadeMetragem);
      case 'PESO':
        return num(m.quantidadePeso);
      case 'AREA':
        return num(m.quantidadeArea);
      case 'VOLUME':
        return num(m.quantidadeVolume);
      default:
        return num(m.quantidadeEspecifica);
    }
  }
}

type PrismaDecimalProxy = { toNumber(): number } | null;

function num(v: PrismaDecimalProxy): number {
  return v ? v.toNumber() : 0;
}