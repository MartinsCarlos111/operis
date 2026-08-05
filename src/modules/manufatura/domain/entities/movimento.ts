import type { TipoUnidadeMedida } from './centro-trabalho.js';

/** ex-EnumTipoMovimento (sem o sentinela UNKNOWN=0). */
export const TipoMovimento = {
  PREPARACAO: 'PREPARACAO',
  REPORTE: 'REPORTE',
  REFUGO: 'REFUGO',
  PARADA: 'PARADA',
  TROCA_FERRAMENTAL: 'TROCA_FERRAMENTAL',
  TROCA_TURNO: 'TROCA_TURNO',
  RECUSA: 'RECUSA',
  ALERTA: 'ALERTA',
  HISTORICO: 'HISTORICO',
  ESTORNO: 'ESTORNO',
  REQUISICAO: 'REQUISICAO',
  DEVOLUCAO: 'DEVOLUCAO',
  CONSUMO_LOTE: 'CONSUMO_LOTE',
} as const;
export type TipoMovimento = (typeof TipoMovimento)[keyof typeof TipoMovimento];

/** Rótulos do `[Description]` legado — usados nas mensagens de erro do RN. */
const ROTULO: Record<TipoMovimento, string> = {
  PREPARACAO: 'Preparação',
  REPORTE: 'Reporte',
  REFUGO: 'Refugo',
  PARADA: 'Parada',
  TROCA_FERRAMENTAL: 'Troca de Ferramenta',
  TROCA_TURNO: 'Troca de Turno',
  RECUSA: 'Recusa',
  ALERTA: 'Alerta',
  HISTORICO: 'Histórico',
  ESTORNO: 'Estorno',
  REQUISICAO: 'Requisição',
  DEVOLUCAO: 'Devolução',
  CONSUMO_LOTE: 'Consumo de Lote',
};

/**
 * Tipos que NÃO exigem ordem de produção. O RN escreve a regra pela negativa
 * — todo o resto precisa de ordem associada.
 */
const DISPENSAM_ORDEM: readonly TipoMovimento[] = [
  TipoMovimento.PARADA,
  TipoMovimento.ALERTA,
  TipoMovimento.RECUSA,
  TipoMovimento.TROCA_FERRAMENTAL,
  TipoMovimento.TROCA_TURNO,
];

/** Tipos que movimentam material e por isso exigem reserva. */
const EXIGEM_RESERVA: readonly TipoMovimento[] = [
  TipoMovimento.REQUISICAO,
  TipoMovimento.DEVOLUCAO,
];

/** Uma coluna por unidade — a do Centro de Trabalho é a que vale. */
export interface QuantidadesMovimento {
  unidade: number | null;
  metragem: number | null;
  peso: number | null;
  area: number | null;
  volume: number | null;
  especifica: number | null;
}

/** Mapeia a unidade do Centro de Trabalho para a coluna correspondente. */
const COLUNA_POR_UNIDADE: Record<TipoUnidadeMedida, keyof QuantidadesMovimento> = {
  UNIDADE: 'unidade',
  METRAGEM: 'metragem',
  PESO: 'peso',
  AREA: 'area',
  VOLUME: 'volume',
  ESPECIFICA: 'especifica',
};

export interface DadosManutencao {
  tecnicoManutencao: string | null;
  ordemManutencao: string | null;
  fimSolicitacao: Date | null;
  fimManutencao: Date | null;
  descricaoCausa: string | null;
}

interface MovimentoProps {
  idMovimento: string;
  tipo: TipoMovimento;
  centroTrabalhoId: string;
  ordemProducaoId: string | null;
  reservaId: string | null;
  usuarioId: string;
  operador: string;
  turnoId: string;
  dataTurno: Date;
  inicio: Date;
  fim: Date | null;
  duracaoSegundos: number | null;
  consideraOee: boolean;
  quantidades: QuantidadesMovimento;
  tipoParadaId: string | null;
  tipoRefugoId: string | null;
  tipoCausaId: string | null;
  tipoRecusaId: string | null;
  manutencao: DadosManutencao;
  tempoSolicitacaoSegundos: number | null;
  tempoManutencaoSegundos: number | null;
  reportaErp: boolean;
  dataIntegracao: Date | null;
  cancelado: boolean;
  usuarioCancelamentoId: string | null;
  observacao: string | null;
  criadoEm: Date;
  atualizadoEm: Date;
}

type Parcial<T> = { [K in keyof T]?: T[K] | undefined };

export interface DadosMovimento {
  tipo: TipoMovimento;
  centroTrabalhoId: string;
  usuarioId: string;
  operador: string;
  turnoId: string;
  /** Unidade em que o Centro de Trabalho reporta — decide a coluna de qtd. */
  unidadeMedidaCentro: TipoUnidadeMedida;
  ordemProducaoId?: string | null | undefined;
  reservaId?: string | null | undefined;
  dataTurno?: Date | undefined;
  inicio?: Date | undefined;
  fim?: Date | null | undefined;
  consideraOee?: boolean | undefined;
  quantidades?: Parcial<QuantidadesMovimento> | undefined;
  tipoParadaId?: string | null | undefined;
  tipoRefugoId?: string | null | undefined;
  tipoCausaId?: string | null | undefined;
  tipoRecusaId?: string | null | undefined;
  manutencao?: Parcial<DadosManutencao> | undefined;
  reportaErp?: boolean | undefined;
  observacao?: string | null | undefined;
}

/**
 * Movimento de chão de fábrica (migrado de Octopus `Movimento` +
 * `MovimentosRN.ValidarMovimento`). Raiz de agregado.
 *
 * Guarda as regras que dependem só do próprio objeto:
 *   1. operador não vazio        → "Código Operador está vazio."
 *   2. tipos que exigem ordem    → "Movimentos do tipo 'X' precisam de uma ordem associada."
 *   3. REQUISICAO/DEVOLUCAO      → "...precisam de uma Reserva associada."
 *   4. PARADA/REFUGO/RECUSA      → exigem a classificação correspondente
 *   5. `inicio` default agora
 *   6. ESTORNO AUTOMÁTICO: quantidade negativa num REPORTE inverte o sinal e
 *      converte o movimento em ESTORNO
 *   7. duração derivada de (fim − inicio), idem tempos de manutenção
 *
 * As que precisam de banco — centro/ordem/reserva/turno existem, autocadastro
 * de tipos vindo do terminal — ficam no use-case, como no RN original.
 */
export class Movimento {
  private constructor(private props: MovimentoProps) {}

  static criar(input: DadosMovimento & { idMovimento: string; inicioTurno?: Date }): Movimento {
    const agora = new Date();
    const campos = Movimento.validar(input, agora);

    return new Movimento({
      idMovimento: input.idMovimento,
      ...campos,
      // "DtTurno default DtHrInicioTurno": sem data informada, o movimento
      // pertence ao dia em que o turno começou.
      dataTurno: input.dataTurno ?? input.inicioTurno ?? campos.inicio,
      criadoEm: agora,
      atualizadoEm: agora,
    });
  }

  static restaurar(props: MovimentoProps): Movimento {
    return new Movimento(props);
  }

  /**
   * Cancela (MovimentosRN.CancelarMovimento):
   *   - já cancelado          → erro
   *   - já integrado          → erro (não se mexe no que o ERP consumiu)
   *   - concatena a observação com timestamp, preservando a anterior com " | "
   */
  cancelar(input: { observacao?: string | undefined; usuarioCancelamentoId?: string | undefined; agora?: Date }): void {
    if (this.props.cancelado) {
      throw new Error(`Movimento '${this.props.idMovimento}' já está cancelado`);
    }
    if (this.props.dataIntegracao !== null) {
      throw new Error(
        `Não é possível cancelar o movimento '${this.props.idMovimento}' pois ele já está integrado.`,
      );
    }

    const agora = input.agora ?? new Date();
    const marca = `Movimento cancelado (${formatarBr(agora)}): ${input.observacao ?? ''}`;

    this.props.cancelado = true;
    this.props.usuarioCancelamentoId = input.usuarioCancelamentoId ?? null;
    this.props.observacao =
      this.props.observacao && this.props.observacao.trim() !== ''
        ? `${this.props.observacao} | ${marca}`
        : marca;
    this.props.atualizadoEm = agora;
  }

  /**
   * Reintegra (MovimentosRN.ReintegrarMovimento): só faz sentido para
   * movimentos que o ERP consome. Limpa a integração e o cancelamento — o
   * recálculo de indicadores é responsabilidade do use-case (precisa de repo).
   */
  reintegrar(): void {
    if (!this.props.reportaErp) {
      throw new Error(
        `Não é possível reintegrar o movimento '${this.props.idMovimento}' pois não é um movimento considerado na integração.`,
      );
    }
    this.props.dataIntegracao = null;
    this.props.cancelado = false;
    this.props.usuarioCancelamentoId = null;
    this.props.atualizadoEm = new Date();
  }

  /** Quantidade na unidade em que o Centro de Trabalho reporta. */
  quantidadeEm(unidade: TipoUnidadeMedida): number | null {
    return this.props.quantidades[COLUNA_POR_UNIDADE[unidade]];
  }

  estaAberto(): boolean {
    return this.props.fim === null;
  }

  private static validar(
    input: DadosMovimento,
    agora: Date,
  ): Omit<MovimentoProps, 'idMovimento' | 'dataTurno' | 'criadoEm' | 'atualizadoEm'> {
    const operador = (input.operador ?? '').trim();
    if (operador === '') {
      throw new Error('Código Operador está vazio.');
    }

    const ordemProducaoId = input.ordemProducaoId ?? null;
    if (!DISPENSAM_ORDEM.includes(input.tipo) && !ordemProducaoId) {
      throw new Error(
        `Movimentos do tipo '${ROTULO[input.tipo]}' precisam de uma ordem associada.`,
      );
    }

    const reservaId = input.reservaId ?? null;
    if (EXIGEM_RESERVA.includes(input.tipo) && !reservaId) {
      throw new Error(
        `Movimentos do tipo '${ROTULO[input.tipo]}' precisam de uma Reserva associada.`,
      );
    }

    const tipoParadaId = input.tipoParadaId ?? null;
    if (input.tipo === TipoMovimento.PARADA && !tipoParadaId) {
      throw new Error("Movimentos do tipo 'Parada' precisam de um tipo parada associado.");
    }

    const tipoRefugoId = input.tipoRefugoId ?? null;
    if (input.tipo === TipoMovimento.REFUGO && !tipoRefugoId) {
      throw new Error("Movimentos do tipo 'Refugo' precisam de um tipo refugo associado.");
    }

    const tipoRecusaId = input.tipoRecusaId ?? null;
    if (input.tipo === TipoMovimento.RECUSA && !tipoRecusaId) {
      throw new Error("Movimentos do tipo 'Recusa' precisam de um tipo recusa associado.");
    }

    const inicio = input.inicio ?? agora;
    const fim = input.fim ?? null;
    if (fim && fim < inicio) {
      throw new Error('A data de fim do movimento não pode ser anterior à de início.');
    }

    // Regra do estorno automático: um REPORTE com quantidade negativa é, na
    // verdade, uma devolução de produção — o legado inverte o sinal e troca o
    // tipo em vez de gravar quantidade negativa.
    let tipo = input.tipo;
    const quantidades = completarQuantidades(input.quantidades);
    const coluna = COLUNA_POR_UNIDADE[input.unidadeMedidaCentro];
    const quantidade = quantidades[coluna];

    if (tipo === TipoMovimento.REPORTE && quantidade !== null && quantidade < 0) {
      quantidades[coluna] = -quantidade;
      tipo = TipoMovimento.ESTORNO;
    }

    const manutencao = completarManutencao(input.manutencao);

    return {
      tipo,
      centroTrabalhoId: input.centroTrabalhoId,
      ordemProducaoId,
      reservaId,
      usuarioId: input.usuarioId,
      operador,
      turnoId: input.turnoId,
      inicio,
      fim,
      duracaoSegundos: diferencaSegundos(inicio, fim),
      consideraOee: input.consideraOee ?? true,
      quantidades,
      tipoParadaId,
      tipoRefugoId,
      tipoCausaId: input.tipoCausaId ?? null,
      tipoRecusaId,
      manutencao,
      tempoSolicitacaoSegundos: diferencaSegundos(inicio, manutencao.fimSolicitacao),
      tempoManutencaoSegundos: diferencaSegundos(inicio, manutencao.fimManutencao),
      reportaErp: input.reportaErp ?? false,
      // "DtFim preenchida + não reporta ao ERP" ⇒ nada a integrar: o movimento
      // já nasce marcado como integrado (regra do RN).
      dataIntegracao: fim !== null && (input.reportaErp ?? false) === false ? agora : null,
      cancelado: false,
      usuarioCancelamentoId: null,
      observacao: input.observacao ?? null,
    };
  }

  get idMovimento(): string {
    return this.props.idMovimento;
  }
  get tipo(): TipoMovimento {
    return this.props.tipo;
  }
  get centroTrabalhoId(): string {
    return this.props.centroTrabalhoId;
  }
  get ordemProducaoId(): string | null {
    return this.props.ordemProducaoId;
  }
  get reservaId(): string | null {
    return this.props.reservaId;
  }
  get usuarioId(): string {
    return this.props.usuarioId;
  }
  get operador(): string {
    return this.props.operador;
  }
  get turnoId(): string {
    return this.props.turnoId;
  }
  get dataTurno(): Date {
    return this.props.dataTurno;
  }
  get inicio(): Date {
    return this.props.inicio;
  }
  get fim(): Date | null {
    return this.props.fim;
  }
  get duracaoSegundos(): number | null {
    return this.props.duracaoSegundos;
  }
  get consideraOee(): boolean {
    return this.props.consideraOee;
  }
  get quantidades(): QuantidadesMovimento {
    return { ...this.props.quantidades };
  }
  get tipoParadaId(): string | null {
    return this.props.tipoParadaId;
  }
  get tipoRefugoId(): string | null {
    return this.props.tipoRefugoId;
  }
  get tipoCausaId(): string | null {
    return this.props.tipoCausaId;
  }
  get tipoRecusaId(): string | null {
    return this.props.tipoRecusaId;
  }
  get manutencao(): DadosManutencao {
    return { ...this.props.manutencao };
  }
  get tempoSolicitacaoSegundos(): number | null {
    return this.props.tempoSolicitacaoSegundos;
  }
  get tempoManutencaoSegundos(): number | null {
    return this.props.tempoManutencaoSegundos;
  }
  get reportaErp(): boolean {
    return this.props.reportaErp;
  }
  get dataIntegracao(): Date | null {
    return this.props.dataIntegracao;
  }
  get cancelado(): boolean {
    return this.props.cancelado;
  }
  get usuarioCancelamentoId(): string | null {
    return this.props.usuarioCancelamentoId;
  }
  get observacao(): string | null {
    return this.props.observacao;
  }
  get criadoEm(): Date {
    return this.props.criadoEm;
  }
  get atualizadoEm(): Date {
    return this.props.atualizadoEm;
  }
}

function completarQuantidades(
  parcial?: Parcial<QuantidadesMovimento> | undefined,
): QuantidadesMovimento {
  return {
    unidade: parcial?.unidade ?? null,
    metragem: parcial?.metragem ?? null,
    peso: parcial?.peso ?? null,
    area: parcial?.area ?? null,
    volume: parcial?.volume ?? null,
    especifica: parcial?.especifica ?? null,
  };
}

function completarManutencao(parcial?: Parcial<DadosManutencao> | undefined): DadosManutencao {
  return {
    tecnicoManutencao: parcial?.tecnicoManutencao ?? null,
    ordemManutencao: parcial?.ordemManutencao ?? null,
    fimSolicitacao: parcial?.fimSolicitacao ?? null,
    fimManutencao: parcial?.fimManutencao ?? null,
    descricaoCausa: parcial?.descricaoCausa ?? null,
  };
}

/** Só conta quando o fim é posterior ao início (mesma guarda do RN). */
function diferencaSegundos(inicio: Date, fim: Date | null): number | null {
  if (!fim || fim <= inicio) return null;
  return Math.round((fim.getTime() - inicio.getTime()) / 1000);
}

/** dd/MM/yyyy HH:mm:ss — o formato da marca de cancelamento do legado. */
function formatarBr(data: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(data.getDate())}/${p(data.getMonth() + 1)}/${data.getFullYear()} ${p(data.getHours())}:${p(data.getMinutes())}:${p(data.getSeconds())}`;
}
