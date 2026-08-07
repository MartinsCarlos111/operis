import type { PrismaClient } from '@prisma/client';
import type { GeradorId } from '@shared/domain/gerador-id.js';
import { MontarOeeService, type TurnoLike } from '../domain/services/montar-oee.service.js';
import { PrismaCalculoIndicadoresRepository } from '../infrastructure/persistence/prisma-calculo-indicadores.repository.js';
import { PrismaFonteMovimentos } from '../infrastructure/persistence/prisma-fonte-movimentos.js';

export type LogWorker = (nivel: 'info' | 'erro', msg: string, extra?: unknown) => void;

export interface OpcoesIndicadoresWorker {
  prisma: PrismaClient;
  ids: GeradorId;
  /** Intervalo entre os ticks. Default 10s (paridade com ManServiceCalc). */
  intervaloMs?: number;
  log?: LogWorker;
}

/**
 * Worker periódico que executa o cálculo de OEE (migrado de
 * `ManServiceCalc.CalcularOEE`). Tick a cada 10s:
 *   1. Lista centros ativos do tenant.
 *   2. Para cada centro, lista turnos do calendário cuja janela engloba agora.
 *   3. Para cada par (centro, turno), invoca `MontarOeeService.montarPorTurno`.
 *
 * Diferentemente do `IotWorker` (event-loop AMQP), este é um `setInterval`
 * porque o legado é justamente uma thread com timer. O escape leva em conta
 * que os UCs são idempotentes — falha num centro não derruba o ciclo todo.
 */
export class IndicadoresWorker {
  private readonly intervaloMs: number;
  private readonly service: MontarOeeService;
  private readonly repos: PrismaCalculoIndicadoresRepository;
  private readonly prisma: PrismaClient;
  private readonly log: LogWorker;
  private timer: ReturnType<typeof setInterval> | null = null;
  private rodando = false;

  constructor(opcoes: OpcoesIndicadoresWorker) {
    this.prisma = opcoes.prisma;
    this.intervaloMs = opcoes.intervaloMs ?? 10_000;
    this.log = opcoes.log ?? (() => {});
    this.repos = new PrismaCalculoIndicadoresRepository(opcoes.prisma);
    this.service = new MontarOeeService(
      new PrismaFonteMovimentos(opcoes.prisma),
      this.repos,
      opcoes.ids,
    );
  }

  async iniciar(): Promise<void> {
    if (this.timer) return;
    this.log('info', 'IndicadoresWorker iniciado');
    // Tick inicial sem esperar o intervalo — responde depressa no boot.
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
      const centros = await this.prisma.centroTrabalho.findMany({
        where: { status: 'ATIVO' },
        include: { calendario: { include: { turnos: { where: { status: 'ATIVO' } } } } },
      });
      const agora = new Date();
      for (const centro of centros) {
        const diaTurno = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
        const turnos = centro.calendario.turnos;
        for (const turno of turnos) {
          if (!turnoPraticado(turno, agora)) continue;
          const janela = resolverJanela(turno, agora);
          if (agora < janela.inicio || agora >= janela.fim) continue;
          try {
            await this.service.montarPorTurno({
              estabelecimentoId: centro.estabelecimentoId,
              centroTrabalhoId: centro.idCentroTrabalho,
              turno: turnoParaDominio(turno),
              diaTurno,
              custoMaquinaHora: 0,
              qtdMeta: 0,
            });
          } catch (err) {
            this.log('erro', `Falha ao recalcular OEE do centro ${centro.idCentroTrabalho}: ${(err as Error).message}`);
          }
        }
      }
    } catch (err) {
      this.log('erro', `IndicadoresWorker.tick falhou: ${(err as Error).message}`);
    } finally {
      this.rodando = false;
    }
  }
}

/** Helper: instanceof Turno via duck-type para evitar importar Turno (fronteira). */
function turnoPraticado(turno: { diasSemana: ReadonlyArray<string> }, agora: Date): boolean {
  const diasPt = ['DOMINGO', 'SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO'];
  const nome = diasPt[agora.getDay()];
  return nome !== undefined && turno.diasSemana.includes(nome);
}

function resolverJanela(turno: { inicioMinutos: number; fimMinutos: number }, dia: Date): { inicio: Date; fim: Date } {
  const base = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate());
  const inicio = new Date(base);
  inicio.setMinutes(turno.inicioMinutos);
  const fim = new Date(base);
  fim.setMinutes(turno.fimMinutos);
  if (inicio >= fim) fim.setDate(fim.getDate() + 1);
  return { inicio, fim };
}

/**
 * Proxy que satisfaz a interface `TurnoLike` exigida pelo `MontarOeeService`
 * a partir de uma row Prisma — evita importar o agregado concreto do
 * manufatura (fronteira protegida).
 */
function turnoParaDominio(turno: {
  idTurno: string;
  inicioMinutos: number;
  fimMinutos: number;
  tempoTotalMinutos: number;
  tempoDisponivelMinutos: number;
  diasSemana: string[];
}): TurnoLike {
  return {
    idTurno: turno.idTurno,
    inicioMinutos: turno.inicioMinutos,
    fimMinutos: turno.fimMinutos,
    tempoTotalMinutos: turno.tempoTotalMinutos,
    tempoDisponivelMinutos: turno.tempoDisponivelMinutos,
    diasSemana: turno.diasSemana,
    resolverJanela(dia: Date) {
      const { inicio, fim } = resolverJanela(this, dia);
      const viraODia = inicio >= fim;
      return { inicio, fim, viraODia };
    },
    praticadoEm(dia: Date) {
      return turnoPraticado(this, dia);
    },
  };
}