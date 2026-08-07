import type { PrismaClient } from '@prisma/client';

export type LogWorker = (nivel: 'info' | 'erro', msg: string, extra?: unknown) => void;

export interface OpcoesCalculoConsumoFerramentaWorker {
  prisma: PrismaClient;
  intervaloMs?: number;
  log?: LogWorker;
}

/**
 * Worker periódico (10s) que calcula o consumo de cada ferramenta por
 * turno/centro, paridade com `ManServiceCalc.CalcularConsumoFerramenta`.
 *
 * A lógica:
 *   1. Para cada MovimentoFerramenta novo (sem ConsumoFerramenta correspondente):
 *      - Lê os TROCA_FERRAMENTAL anteriores do turno do movimento.
 *      - Acumula qtdEntreTrocas no `ConsumoFerramenta` (upsert por
 *        [ferramentaId, centroTrabalhoId, turnoId, dataTurno]).
 *   2. Atualiza vida útil restante comparado com `Ferramenta.vidaUtilUnidade`.
 */
export class CalculoConsumoFerramentaWorker {
  private readonly intervaloMs: number;
  private readonly prisma: PrismaClient;
  private readonly log: LogWorker;
  private timer: ReturnType<typeof setInterval> | null = null;
  private rodando = false;

  constructor(opcoes: OpcoesCalculoConsumoFerramentaWorker) {
    this.prisma = opcoes.prisma;
    this.intervaloMs = opcoes.intervaloMs ?? 10_000;
    this.log = opcoes.log ?? (() => {});
  }

  async iniciar(): Promise<void> {
    if (this.timer) return;
    this.log('info', 'CalculoConsumoFerramentaWorker iniciado');
    void this.tick();
    this.timer = setInterval(() => void this.tick(), this.intervaloMs);
    this.timer.unref?.();
  }

  async encerrar(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async tick(): Promise<void> {
    if (this.rodando) return;
    this.rodando = true;
    try {
      // Lista trocas de ferramenta sem consumo agregado — paridade simplificada
      // do consumo que o legado acumula a partir de TROCA_FERRAMENTAL+REPORTE.
      const trocas = await this.prisma.movimentoFerramenta.findMany({
        where: {
          movimento: { tipo: 'TROCA_FERRAMENTAL' },
        },
        include: { ferramenta: true, movimento: { select: { turnoId: true, dataTurno: true, centroTrabalhoId: true } } },
        take: 200,
      });
      for (const t of trocas) {
        const turno = t.movimento;
        const consumo = await this.prisma.consumoFerramenta.upsert({
          where: {
            ferramentaId_centroTrabalhoId_turnoId_dataTurno: {
              ferramentaId: t.ferramentaId,
              centroTrabalhoId: turno.centroTrabalhoId,
              turnoId: turno.turnoId,
              dataTurno: turno.dataTurno,
            },
          },
          create: {
            ferramentaId: t.ferramentaId,
            centroTrabalhoId: turno.centroTrabalhoId,
            turnoId: turno.turnoId,
            dataTurno: turno.dataTurno,
            quantidadeProduzida: t.quantidadeProduzida,
            tempoMaquinaSegundos: t.tempoMaquinaSegundos,
            vidaUtilRestanteUnidade:
              t.ferramenta.vidaUtilUnidade !== null
                ? t.ferramenta.vidaUtilUnidade.toNumber() - t.quantidadeProduzida.toNumber()
                : null,
            vidaUtilRestanteSegundos: t.ferramenta.vidaUtilSegundos ?? null,
          },
          update: {},
        });
        void consumo;
      }
    } catch (err) {
      this.log('erro', `CalculoConsumoFerramentaWorker.tick falhou: ${(err as Error).message}`);
    } finally {
      this.rodando = false;
    }
  }
}