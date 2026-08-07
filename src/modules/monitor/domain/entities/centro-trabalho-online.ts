/** ex-EnumStatusCentroTrabalhoOnline. Substitui os 8 inteiros do legado. */
export const StatusCentroTrabalhoOnline = {
  PRODUZINDO: 'PRODUZINDO',
  PARADA: 'PARADA',
  EM_SETUP: 'EM_SETUP',
  MANUTENCAO_SOLICITADA: 'MANUTENCAO_SOLICITADA',
  MANUTENCAO_EM_ATENDIMENTO: 'MANUTENCAO_EM_ATENDIMENTO',
  OCIOSA: 'OCIOSA',
  DESCONECTADA: 'DESCONECTADA',
  BAIXO_DESEMPENHO: 'BAIXO_DESEMPENHO',
} as const;
export type StatusCentroTrabalhoOnline =
  (typeof StatusCentroTrabalhoOnline)[keyof typeof StatusCentroTrabalhoOnline];

interface CentroTrabalhoOnlineProps {
  idCentroTrabalhoOnline: string;
  centroTrabalhoId: string;
  calculoIndicadoresId: string | null;
  status: StatusCentroTrabalhoOnline;
  movimentoAbertoId: string | null;
  ordemProducaoId: string | null;
  ultimaAtualizacao: Date;
}

export interface DadosCentroTrabalhoOnline {
  centroTrabalhoId: string;
  calculoIndicadoresId?: string | null | undefined;
  movimentoAbertoId?: string | null | undefined;
  ordemProducaoId?: string | null | undefined;
}

/**
 * Snapshot em tempo real de um centro de trabalho (migrado de
 * `CentroTrabalhoOnline`). É atualizado pelo `MonitorWorker` a cada 10s
 * (paridade com a thread `MontarCentrosTrabalhoOnline`).
 *
 * O status é derivado pela `CentroTrabalhoOnlineFactory` do legado a partir
 * do movimento em aberto + primeiro/último reporte + crítico de produção —
 * aqui deslocamos a derivação para o use-case que chama `atualizarStatus`.
 */
export class CentroTrabalhoOnline {
  private constructor(private props: CentroTrabalhoOnlineProps) {}

  static criar(input: DadosCentroTrabalhoOnline & { idCentroTrabalhoOnline: string }): CentroTrabalhoOnline {
    return new CentroTrabalhoOnline({
      idCentroTrabalhoOnline: input.idCentroTrabalhoOnline,
      centroTrabalhoId: input.centroTrabalhoId,
      calculoIndicadoresId: input.calculoIndicadoresId ?? null,
      status: StatusCentroTrabalhoOnline.DESCONECTADA,
      movimentoAbertoId: input.movimentoAbertoId ?? null,
      ordemProducaoId: input.ordemProducaoId ?? null,
      ultimaAtualizacao: new Date(),
    });
  }

  static restaurar(props: CentroTrabalhoOnlineProps): CentroTrabalhoOnline {
    return new CentroTrabalhoOnline(props);
  }

  /**
   * Atualiza o snapshot a partir do movimento aberto atual e do indicador
   * do turno corrente (paridade com `CentroTrabalhoOnlineFactory`).
   */
  atualizarStatus(input: {
    status: StatusCentroTrabalhoOnline;
    movimentoAbertoId: string | null;
    ordemProducaoId: string | null;
    calculoIndicadoresId: string | null;
    agora?: Date;
  }): void {
    this.props.status = input.status;
    this.props.movimentoAbertoId = input.movimentoAbertoId;
    this.props.ordemProducaoId = input.ordemProducaoId;
    this.props.calculoIndicadoresId = input.calculoIndicadoresId;
    this.props.ultimaAtualizacao = input.agora ?? new Date();
  }

  get idCentroTrabalhoOnline(): string {
    return this.props.idCentroTrabalhoOnline;
  }
  get centroTrabalhoId(): string {
    return this.props.centroTrabalhoId;
  }
  get calculoIndicadoresId(): string | null {
    return this.props.calculoIndicadoresId;
  }
  get status(): StatusCentroTrabalhoOnline {
    return this.props.status;
  }
  get movimentoAbertoId(): string | null {
    return this.props.movimentoAbertoId;
  }
  get ordemProducaoId(): string | null {
    return this.props.ordemProducaoId;
  }
  get ultimaAtualizacao(): Date {
    return this.props.ultimaAtualizacao;
  }
}