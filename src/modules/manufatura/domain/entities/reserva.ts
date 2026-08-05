import { exigirTexto } from './calendario.js';

/** ex-EnumStatusReserva (0/1/2 no legado). */
export const StatusReserva = {
  NAO_REQUISITADA: 'NAO_REQUISITADA',
  REQUISITADA: 'REQUISITADA',
  CANCELADA: 'CANCELADA',
} as const;
export type StatusReserva = (typeof StatusReserva)[keyof typeof StatusReserva];

interface ReservaProps {
  idReserva: string;
  ordemProducaoId: string;
  sequencia: number;
  itemCodigo: string;
  itemDescricao: string;
  lote: string | null;
  unidadeMedida: string | null;
  quantidadeReserva: number;
  quantidadeRequisitada: number;
  quantidadeDevolvida: number;
  requisicaoTerminal: boolean;
  status: StatusReserva;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface DadosReserva {
  ordemProducaoId: string;
  sequencia: number;
  itemCodigo: string;
  itemDescricao: string;
  lote?: string | null | undefined;
  unidadeMedida?: string | null | undefined;
  quantidadeReserva?: number | undefined;
  quantidadeRequisitada?: number | undefined;
  quantidadeDevolvida?: number | undefined;
  requisicaoTerminal?: boolean | undefined;
}

/**
 * Reserva de material de uma Ordem de Produção (migrada de Octopus `Reserva` +
 * `ReservaRN.ValidarReserva`). Raiz de agregado.
 *
 * Invariantes de forma preservadas do RN (mensagens literais):
 *   1. "Código do Item é inválido."
 *   2. "Descrição do Item é inválida."
 *   3. "A sequência da reserva não pode ser menor do que '1'. Valor recebido: 'N'."
 *   4. "A quantidade da reserva não pode ser menor do que '0'. Valor recebido: 'N'."
 *   5. idem para requisitada e devolvida
 *
 * O STATUS é derivado, nunca informado: `quantidadeRequisitada` 0 →
 * NAO_REQUISITADA, > 0 → REQUISITADA. A única exceção é CANCELADA, que é
 * terminal — uma vez cancelada, a reserva não volta a ser requisitada por
 * mudança de quantidade (`if (reserva.Status != CANCELADA)` no RN).
 *
 * O status da ORDEM (que bloqueia alterações) fica no use-case: precisa de
 * repositório, como no RN original.
 */
export class Reserva {
  private constructor(private props: ReservaProps) {}

  static criar(input: DadosReserva & { idReserva: string }): Reserva {
    const agora = new Date();
    const campos = Reserva.validar(input);
    return new Reserva({
      idReserva: input.idReserva,
      ...campos,
      status: Reserva.derivarStatus(campos.quantidadeRequisitada, StatusReserva.NAO_REQUISITADA),
      criadoEm: agora,
      atualizadoEm: agora,
    });
  }

  static restaurar(props: ReservaProps): Reserva {
    return new Reserva(props);
  }

  alterar(input: DadosReserva): void {
    const campos = Reserva.validar(input);
    Object.assign(this.props, campos);
    this.props.status = Reserva.derivarStatus(campos.quantidadeRequisitada, this.props.status);
    this.props.atualizadoEm = new Date();
  }

  /**
   * Cancela a reserva. Idempotente — cancelar o que já está cancelado não é
   * erro (o RN retorna sucesso de imediato nesse caso).
   *
   * Retorna `true` quando houve transição, `false` quando já estava cancelada;
   * o use-case usa isso para decidir se precisa cancelar os movimentos
   * vinculados e gravar.
   */
  cancelar(): boolean {
    if (this.props.status === StatusReserva.CANCELADA) return false;
    this.props.status = StatusReserva.CANCELADA;
    this.props.atualizadoEm = new Date();
    return true;
  }

  estaCancelada(): boolean {
    return this.props.status === StatusReserva.CANCELADA;
  }

  /** Saldo ainda em poder do chão de fábrica (requisitado menos devolvido). */
  saldoRequisitado(): number {
    return this.props.quantidadeRequisitada - this.props.quantidadeDevolvida;
  }

  private static derivarStatus(
    quantidadeRequisitada: number,
    statusAtual: StatusReserva,
  ): StatusReserva {
    if (statusAtual === StatusReserva.CANCELADA) return StatusReserva.CANCELADA;
    return quantidadeRequisitada > 0
      ? StatusReserva.REQUISITADA
      : StatusReserva.NAO_REQUISITADA;
  }

  private static validar(
    input: DadosReserva,
  ): Omit<ReservaProps, 'idReserva' | 'status' | 'criadoEm' | 'atualizadoEm'> {
    const itemCodigo = exigirTexto(input.itemCodigo, 'Código do Item é inválido.');
    const itemDescricao = exigirTexto(input.itemDescricao, 'Descrição do Item é inválida.');

    if (!Number.isInteger(input.sequencia) || input.sequencia < 1) {
      throw new Error(
        `A sequência da reserva não pode ser menor do que '1'. Valor recebido: '${input.sequencia}'.`,
      );
    }

    const quantidadeReserva = exigirNaoNegativo(
      input.quantidadeReserva ?? 0,
      'A quantidade da reserva não pode ser menor do que',
    );
    const quantidadeRequisitada = exigirNaoNegativo(
      input.quantidadeRequisitada ?? 0,
      'A quantidade requisitada da reserva não pode ser menor do que',
    );
    const quantidadeDevolvida = exigirNaoNegativo(
      input.quantidadeDevolvida ?? 0,
      'A quantidade devolvida da reserva não pode ser menor do que',
    );

    return {
      ordemProducaoId: input.ordemProducaoId,
      sequencia: input.sequencia,
      itemCodigo,
      itemDescricao,
      lote: input.lote ?? null,
      unidadeMedida: input.unidadeMedida ?? null,
      quantidadeReserva,
      quantidadeRequisitada,
      quantidadeDevolvida,
      requisicaoTerminal: input.requisicaoTerminal ?? false,
    };
  }

  get idReserva(): string {
    return this.props.idReserva;
  }
  get ordemProducaoId(): string {
    return this.props.ordemProducaoId;
  }
  get sequencia(): number {
    return this.props.sequencia;
  }
  get itemCodigo(): string {
    return this.props.itemCodigo;
  }
  get itemDescricao(): string {
    return this.props.itemDescricao;
  }
  get lote(): string | null {
    return this.props.lote;
  }
  get unidadeMedida(): string | null {
    return this.props.unidadeMedida;
  }
  get quantidadeReserva(): number {
    return this.props.quantidadeReserva;
  }
  get quantidadeRequisitada(): number {
    return this.props.quantidadeRequisitada;
  }
  get quantidadeDevolvida(): number {
    return this.props.quantidadeDevolvida;
  }
  get requisicaoTerminal(): boolean {
    return this.props.requisicaoTerminal;
  }
  get status(): StatusReserva {
    return this.props.status;
  }
  get criadoEm(): Date {
    return this.props.criadoEm;
  }
  get atualizadoEm(): Date {
    return this.props.atualizadoEm;
  }
}

/** Mensagem no formato do RN: "<prefixo> '0'. Valor recebido: 'N'." */
function exigirNaoNegativo(valor: number, prefixo: string): number {
  if (!Number.isFinite(valor) || valor < 0) {
    throw new Error(`${prefixo} '0'. Valor recebido: '${valor}'.`);
  }
  return valor;
}
