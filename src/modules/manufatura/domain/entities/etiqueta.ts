import type { TipoUnidadeMedida } from './centro-trabalho.js';

export const StatusEtiqueta = {
  DISPONIVEL: 'DISPONIVEL',
  UTILIZADA: 'UTILIZADA',
  CANCELADA: 'CANCELADA',
  BAIXADA: 'BAIXADA',
  ESTORNADA: 'ESTORNADA',
} as const;
export type StatusEtiqueta = (typeof StatusEtiqueta)[keyof typeof StatusEtiqueta];

export const MotivoGeracaoEtiqueta = {
  REPORTE: 'REPORTE',
  REIMPRESSAO: 'REIMPRESSAO',
  CANCELAMENTO: 'CANCELAMENTO',
  MANUAL: 'MANUAL',
} as const;
export type MotivoGeracaoEtiqueta = (typeof MotivoGeracaoEtiqueta)[keyof typeof MotivoGeracaoEtiqueta];

interface EtiquetaProps {
  idEtiqueta: string;
  codigoBarras: string;
  sequencial: number;
  motivoGeracao: MotivoGeracaoEtiqueta;
  status: StatusEtiqueta;
  quantidade: number;
  unidadeMedida: TipoUnidadeMedida;
  ordemProducaoId: string;
  movimentoId: string | null;
  layoutId: string | null;
  impressoEm: Date | null;
  baixadoEm: Date | null;
  usuarioId: string;
  observacao: string | null;
  estabelecimentoId: string;
}

export interface DadosEtiqueta {
  sequencial: number;
  codigoBarras: string;
  quantidade: number;
  unidadeMedida: TipoUnidadeMedida;
  ordemProducaoId: string;
  movimentoId?: string | null | undefined;
  layoutId?: string | null | undefined;
  usuarioId: string;
  estabelecimentoId: string;
  observacao?: string | null | undefined;
  motivoGeracao?: MotivoGeracaoEtiqueta | undefined;
}

/**
 * Etiqueta física de manufatura (migrada de Octopus `Etiqueta`). Cada reporte
 * (`MotivoGeracao = REPORTE`) gera uma etiqueta; reimpressões e cancelamentos
 * preservam o `codigoBarras`/`sequencial` original e só mudam `status`.
 *
 * É a manifestação física do item concluído — a `Rastreabilidade` conecta
 * etiqueta↔ordem↔movimento↔qtd. A integração ERP promove `Baixada` quando
 * o cliente confirma.
 */
export class Etiqueta {
  private constructor(private props: EtiquetaProps) {}

  static criar(input: DadosEtiqueta & { idEtiqueta: string }): Etiqueta {
    if (!input.codigoBarras.trim()) {
      throw new Error('Código de barras da etiqueta não pode ser vazio.');
    }
    if (!Number.isInteger(input.sequencial) || input.sequencial < 1) {
      throw new Error('Sequencial da etiqueta deve ser inteiro positivo.');
    }
    if (input.quantidade < 0) {
      throw new Error('Quantidade da etiqueta não pode ser negativa.');
    }
    const agora = new Date();
    return new Etiqueta({
      idEtiqueta: input.idEtiqueta,
      codigoBarras: input.codigoBarras,
      sequencial: input.sequencial,
      motivoGeracao: input.motivoGeracao ?? MotivoGeracaoEtiqueta.REPORTE,
      status: StatusEtiqueta.DISPONIVEL,
      quantidade: input.quantidade,
      unidadeMedida: input.unidadeMedida,
      ordemProducaoId: input.ordemProducaoId,
      movimentoId: input.movimentoId ?? null,
      layoutId: input.layoutId ?? null,
      impressoEm: null,
      baixadoEm: null,
      usuarioId: input.usuarioId,
      observacao: input.observacao ?? null,
      estabelecimentoId: input.estabelecimentoId,
    });
  }

  static restaurar(props: EtiquetaProps): Etiqueta {
    return new Etiqueta(props);
  }

  /** Marca como impressa — paridade com `ImprimirEtiqueta`. */
  marcarImpressa(agora = new Date()): void {
    this.props.impressoEm = agora;
  }

  /** Cancela — paridade com `CancelarEtiqueta`; só permite DISPONIVEL→CANCELADA. */
  cancelar(observacao: string | null, agora = new Date()): void {
    if (this.props.status !== StatusEtiqueta.DISPONIVEL) {
      throw new Error(`Etiqueta ${this.props.codigoBarras} não pode ser cancelada (status atual: ${this.props.status}).`);
    }
    this.props.status = StatusEtiqueta.CANCELADA;
    this.props.observacao = observacao ?? this.props.observacao;
    void agora;
  }

  /** Marca BAIXADA — chamada quando ERP confirma; `baixadoEm`preenchido. */
  baixar(agora = new Date()): void {
    if (this.props.status !== StatusEtiqueta.DISPONIVEL && this.props.status !== StatusEtiqueta.UTILIZADA) {
      throw new Error(`Etiqueta ${this.props.codigoBarras} não pode ser baixada (status atual: ${this.props.status}).`);
    }
    this.props.status = StatusEtiqueta.BAIXADA;
    this.props.baixadoEm = agora;
  }

  get idEtiqueta(): string {
    return this.props.idEtiqueta;
  }
  get codigoBarras(): string {
    return this.props.codigoBarras;
  }
  get sequencial(): number {
    return this.props.sequencial;
  }
  get motivoGeracao(): MotivoGeracaoEtiqueta {
    return this.props.motivoGeracao;
  }
  get status(): StatusEtiqueta {
    return this.props.status;
  }
  get quantidade(): number {
    return this.props.quantidade;
  }
  get unidadeMedida(): TipoUnidadeMedida {
    return this.props.unidadeMedida;
  }
  get ordemProducaoId(): string {
    return this.props.ordemProducaoId;
  }
  get movimentoId(): string | null {
    return this.props.movimentoId;
  }
  get layoutId(): string | null {
    return this.props.layoutId;
  }
  get impressoEm(): Date | null {
    return this.props.impressoEm;
  }
  get baixadoEm(): Date | null {
    return this.props.baixadoEm;
  }
  get usuarioId(): string {
    return this.props.usuarioId;
  }
  get observacao(): string | null {
    return this.props.observacao;
  }
  get estabelecimentoId(): string {
    return this.props.estabelecimentoId;
  }
}