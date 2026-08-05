import { StatusRecurso } from '@shared/domain/status-recurso.js';
import { exigirTexto } from './calendario.js';

/** ex-Turno.DiaDaSemana (string serializada no legado). */
export const DiaSemana = {
  DOMINGO: 'DOMINGO',
  SEGUNDA: 'SEGUNDA',
  TERCA: 'TERCA',
  QUARTA: 'QUARTA',
  QUINTA: 'QUINTA',
  SEXTA: 'SEXTA',
  SABADO: 'SABADO',
} as const;
export type DiaSemana = (typeof DiaSemana)[keyof typeof DiaSemana];

/** Ordem de `Date.getDay()` (0 = domingo) — usada para resolver a janela. */
const DIAS_POR_INDICE: DiaSemana[] = [
  DiaSemana.DOMINGO,
  DiaSemana.SEGUNDA,
  DiaSemana.TERCA,
  DiaSemana.QUARTA,
  DiaSemana.QUINTA,
  DiaSemana.SEXTA,
  DiaSemana.SABADO,
];

const MINUTOS_POR_DIA = 24 * 60;

/** Janela concreta do turno num dia específico. */
export interface JanelaTurno {
  inicio: Date;
  fim: Date;
  /** true quando o fim caiu no dia seguinte. */
  viraODia: boolean;
}

interface TurnoProps {
  idTurno: string;
  codigo: string;
  descricao: string;
  calendarioId: string;
  inicioMinutos: number;
  fimMinutos: number;
  tempoTotalMinutos: number;
  tempoDisponivelMinutos: number;
  diasSemana: DiaSemana[];
  util: boolean;
  observacao: string | null;
  status: StatusRecurso;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface DadosTurno {
  codigo: string;
  descricao: string;
  calendarioId: string;
  inicioMinutos: number;
  fimMinutos: number;
  tempoTotalMinutos: number;
  tempoDisponivelMinutos: number;
  diasSemana: DiaSemana[];
  util?: boolean | undefined;
  observacao?: string | null | undefined;
  status?: StatusRecurso | undefined;
}

/**
 * Turno de produção (migrado de Octopus `Turno` + `TurnoRN.ValidarTurno`).
 * Raiz de agregado sob o Calendário.
 *
 * Invariantes preservadas do RN (mensagens literais):
 *   1. "Código Turno inválido."
 *   2. "Descrição do Turno inválida."
 *   3. "Selecione ao menos um dia da semana."
 *   4. "Tempo disponível não pode ser zero."
 *   5. "Tempo total não pode ser zero."
 *   6. "Tempo Disponível não pode ser maior que o Tempo Total."
 *
 * A existência do calendário fica no use-case (precisa de repositório), como no
 * RN original.
 */
export class Turno {
  private constructor(private props: TurnoProps) {}

  static criar(input: DadosTurno & { idTurno: string }): Turno {
    const agora = new Date();
    return new Turno({
      idTurno: input.idTurno,
      ...Turno.validar(input),
      criadoEm: agora,
      atualizadoEm: agora,
    });
  }

  static restaurar(props: TurnoProps): Turno {
    return new Turno(props);
  }

  alterar(input: DadosTurno): void {
    Object.assign(this.props, Turno.validar(input));
    this.props.atualizadoEm = new Date();
  }

  /**
   * Materializa o turno num dia concreto. É AQUI que mora a regra do turno que
   * cruza a meia-noite: quando o início não é anterior ao fim, o fim pertence
   * ao dia seguinte (paridade com `TurnoRN` e `CalculoIndicadoresRN`, que ambos
   * fazem `if (dtInicioTurno >= dtFimTurno) dtFimTurno = dtFimTurno.AddDays(1)`).
   *
   * Ex.: turno 22:00→06:00 no dia 05/08 → 05/08 22:00 até 06/08 06:00.
   */
  resolverJanela(dia: Date): JanelaTurno {
    const base = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate());

    const inicio = new Date(base);
    inicio.setMinutes(this.props.inicioMinutos);

    const fim = new Date(base);
    fim.setMinutes(this.props.fimMinutos);

    const viraODia = inicio >= fim;
    if (viraODia) fim.setDate(fim.getDate() + 1);

    return { inicio, fim, viraODia };
  }

  /** true se o turno é praticado no dia da semana da data informada. */
  praticadoEm(dia: Date): boolean {
    const nome = DIAS_POR_INDICE[dia.getDay()];
    return nome !== undefined && this.props.diasSemana.includes(nome);
  }

  /** Duração da janela em minutos, já considerando a virada do dia. */
  duracaoMinutos(): number {
    const bruta = this.props.fimMinutos - this.props.inicioMinutos;
    return bruta > 0 ? bruta : bruta + MINUTOS_POR_DIA;
  }

  private static validar(input: DadosTurno): Omit<TurnoProps, 'idTurno' | 'criadoEm' | 'atualizadoEm'> {
    const codigo = exigirTexto(input.codigo, 'Código Turno inválido.');
    const descricao = exigirTexto(input.descricao, 'Descrição do Turno inválida.');

    if (input.diasSemana.length === 0) {
      throw new Error('Selecione ao menos um dia da semana.');
    }

    exigirMinutoDoDia(input.inicioMinutos, 'Hora de início do turno inválida.');
    exigirMinutoDoDia(input.fimMinutos, 'Hora de fim do turno inválida.');

    if (input.tempoDisponivelMinutos <= 0) {
      throw new Error('Tempo disponível não pode ser zero.');
    }
    if (input.tempoTotalMinutos <= 0) {
      throw new Error('Tempo total não pode ser zero.');
    }
    if (input.tempoDisponivelMinutos > input.tempoTotalMinutos) {
      throw new Error('Tempo Disponível não pode ser maior que o Tempo Total.');
    }

    // Dias repetidos no input não são erro de negócio, mas duplicá-los na base
    // faria a resolução de janela contar o mesmo dia duas vezes.
    const diasSemana = [...new Set(input.diasSemana)];

    return {
      codigo,
      descricao,
      calendarioId: input.calendarioId,
      inicioMinutos: input.inicioMinutos,
      fimMinutos: input.fimMinutos,
      tempoTotalMinutos: input.tempoTotalMinutos,
      tempoDisponivelMinutos: input.tempoDisponivelMinutos,
      diasSemana,
      util: input.util ?? true,
      observacao: input.observacao ?? null,
      status: input.status ?? StatusRecurso.ATIVO,
    };
  }

  get idTurno(): string {
    return this.props.idTurno;
  }
  get codigo(): string {
    return this.props.codigo;
  }
  get descricao(): string {
    return this.props.descricao;
  }
  get calendarioId(): string {
    return this.props.calendarioId;
  }
  get inicioMinutos(): number {
    return this.props.inicioMinutos;
  }
  get fimMinutos(): number {
    return this.props.fimMinutos;
  }
  get tempoTotalMinutos(): number {
    return this.props.tempoTotalMinutos;
  }
  get tempoDisponivelMinutos(): number {
    return this.props.tempoDisponivelMinutos;
  }
  get diasSemana(): DiaSemana[] {
    return [...this.props.diasSemana];
  }
  get util(): boolean {
    return this.props.util;
  }
  get observacao(): string | null {
    return this.props.observacao;
  }
  get status(): StatusRecurso {
    return this.props.status;
  }
  get criadoEm(): Date {
    return this.props.criadoEm;
  }
  get atualizadoEm(): Date {
    return this.props.atualizadoEm;
  }
}

function exigirMinutoDoDia(valor: number, mensagem: string): void {
  if (!Number.isInteger(valor) || valor < 0 || valor >= MINUTOS_POR_DIA) {
    throw new Error(mensagem);
  }
}
