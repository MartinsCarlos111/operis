import { Reserva, StatusReserva, type DadosReserva } from '../../domain/entities/reserva.js';
import type { StatusOrdemProducao } from '../../domain/entities/ordem-producao.js';
import type { GeradorId } from '@shared/domain/gerador-id.js';
import type {
  CriterioListagemReserva,
  ReservaRepository,
} from '../../domain/repositories/manufatura.repositories.js';
import type { OrdemProducaoRepository } from '../../domain/repositories/ordem-producao.repositories.js';
import {
  OrdemProducaoBloqueiaReservaError,
  ReservaJaExisteError,
  ReservaNaoEncontradaError,
} from '../../domain/exceptions/manufatura.errors.js';
import { OrdemProducaoNaoEncontradaError } from '../../domain/exceptions/ordem-producao.errors.js';
import type { ListaPaginadaDTO } from '../dtos/manufatura.dtos.js';

/**
 * Status de ordem que travam alterações nas reservas — o `switch` do
 * `ReservaRN.ValidarStatusOrdemReserva`. Qualquer outro (Liberada, Não
 * Liberada, Congelada) passa.
 */
const STATUS_QUE_BLOQUEIAM: readonly StatusOrdemProducao[] = [
  'BAIXADA',
  'CANCELADA',
  'CONCLUIDA',
  'RECUSADA',
  'INICIADA',
];

export interface ReservaDTO {
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
  /** Requisitado menos devolvido — o que ainda está no chão de fábrica. */
  saldoRequisitado: number;
  requisicaoTerminal: boolean;
  status: StatusReserva;
  criadoEm: string;
  atualizadoEm: string;
}

export function paraReservaDTO(reserva: Reserva): ReservaDTO {
  return {
    idReserva: reserva.idReserva,
    ordemProducaoId: reserva.ordemProducaoId,
    sequencia: reserva.sequencia,
    itemCodigo: reserva.itemCodigo,
    itemDescricao: reserva.itemDescricao,
    lote: reserva.lote,
    unidadeMedida: reserva.unidadeMedida,
    quantidadeReserva: reserva.quantidadeReserva,
    quantidadeRequisitada: reserva.quantidadeRequisitada,
    quantidadeDevolvida: reserva.quantidadeDevolvida,
    saldoRequisitado: reserva.saldoRequisitado(),
    requisicaoTerminal: reserva.requisicaoTerminal,
    status: reserva.status,
    criadoEm: reserva.criadoEm.toISOString(),
    atualizadoEm: reserva.atualizadoEm.toISOString(),
  };
}

export interface EntradaReserva extends DadosReserva {
  estabelecimentoId: string;
  /**
   * `edicaoTerminal` do legado. O chão de fábrica precisa requisitar material
   * mesmo com a ordem já Iniciada — por isso o terminal pula a validação de
   * status da ordem ("Permite edições vindas do terminal independente do status
   * da ordem"). O site, não.
   */
  origemTerminal?: boolean | undefined;
}

/**
 * Resolve a ordem e, quando a origem NÃO é o terminal, aplica o
 * `ValidarStatusOrdemReserva`. Compartilhada por criar e editar porque o RN
 * roda exatamente a mesma sequência nos dois.
 */
async function exigirOrdemQuePermiteReserva(
  ordemProducaoId: string,
  estabelecimentoId: string,
  origemTerminal: boolean,
  ordens: OrdemProducaoRepository,
): Promise<void> {
  const ordem = await ordens.buscarPorId(ordemProducaoId, estabelecimentoId);
  if (!ordem) {
    throw new OrdemProducaoNaoEncontradaError(ordemProducaoId);
  }

  if (origemTerminal) return;

  const status = ordem.dados.status;
  if (status && STATUS_QUE_BLOQUEIAM.includes(status)) {
    throw new OrdemProducaoBloqueiaReservaError(status);
  }
}

/**
 * Cria uma reserva. Preserva ReservaRN.AdicionarReserva:
 *   1. invariantes de forma (entidade: item, descrição, sequência >= 1, qtds >= 0)
 *   2. ordem existe
 *   3. status da ordem permite (exceto vindo do terminal)
 *   4. (ordem + item + sequência) ainda não cadastrada
 *   5. status derivado de quantidadeRequisitada
 */
export class CriarReservaUseCase {
  constructor(
    private readonly reservas: ReservaRepository,
    private readonly ordens: OrdemProducaoRepository,
    private readonly ids: GeradorId,
  ) {}

  async executar(input: EntradaReserva): Promise<ReservaDTO> {
    const reserva = Reserva.criar({ ...input, idReserva: this.ids.gerar() });

    await exigirOrdemQuePermiteReserva(
      input.ordemProducaoId,
      input.estabelecimentoId,
      input.origemTerminal ?? false,
      this.ordens,
    );

    const existente = await this.reservas.buscarPorIdentidade(
      reserva.ordemProducaoId,
      reserva.itemCodigo,
      reserva.sequencia,
    );
    if (existente) {
      throw new ReservaJaExisteError(reserva.itemCodigo, reserva.sequencia);
    }

    await this.reservas.salvar(reserva);
    return paraReservaDTO(reserva);
  }
}

/** Edita uma reserva (ReservaRN.EditarReserva). */
export class EditarReservaUseCase {
  constructor(
    private readonly reservas: ReservaRepository,
    private readonly ordens: OrdemProducaoRepository,
  ) {}

  async executar(input: EntradaReserva & { idReserva: string }): Promise<ReservaDTO> {
    const reserva = await this.reservas.buscarPorId(input.idReserva, input.estabelecimentoId);
    if (!reserva) {
      throw new ReservaNaoEncontradaError(input.idReserva);
    }

    await exigirOrdemQuePermiteReserva(
      input.ordemProducaoId,
      input.estabelecimentoId,
      input.origemTerminal ?? false,
      this.ordens,
    );

    // A identidade natural (ordem+item+sequência) pode mudar na edição; se
    // mudar, não pode colidir com outra reserva.
    const mudouIdentidade =
      input.itemCodigo.trim() !== reserva.itemCodigo ||
      input.sequencia !== reserva.sequencia ||
      input.ordemProducaoId !== reserva.ordemProducaoId;

    if (mudouIdentidade) {
      const colisao = await this.reservas.buscarPorIdentidade(
        input.ordemProducaoId,
        input.itemCodigo.trim(),
        input.sequencia,
      );
      if (colisao && colisao.idReserva !== reserva.idReserva) {
        throw new ReservaJaExisteError(input.itemCodigo.trim(), input.sequencia);
      }
    }

    reserva.alterar(input);
    await this.reservas.salvar(reserva);
    return paraReservaDTO(reserva);
  }
}

/**
 * Cancela uma reserva (ReservaRN.CancelarReserva). Idempotente: se já está
 * cancelada, retorna sucesso sem tocar em nada.
 *
 * Diferente de criar/editar, o cancelamento NÃO tem bypass de terminal — o RN
 * aplica `ValidarStatusOrdemReserva` incondicionalmente aqui.
 *
 * PENDENTE: o legado também cancela, na mesma transação, os movimentos
 * vinculados (`CancelarMovimentosReserva`). O agregado Movimento ainda não
 * existe; quando existir, este use-case passa a recebê-lo por injeção e o
 * cancelamento vira uma transação única.
 */
export class CancelarReservaUseCase {
  constructor(
    private readonly reservas: ReservaRepository,
    private readonly ordens: OrdemProducaoRepository,
  ) {}

  async executar(input: { idReserva: string; estabelecimentoId: string }): Promise<ReservaDTO> {
    const reserva = await this.reservas.buscarPorId(input.idReserva, input.estabelecimentoId);
    if (!reserva) {
      throw new ReservaNaoEncontradaError(input.idReserva);
    }

    if (reserva.estaCancelada()) {
      return paraReservaDTO(reserva);
    }

    await exigirOrdemQuePermiteReserva(
      reserva.ordemProducaoId,
      input.estabelecimentoId,
      false,
      this.ordens,
    );

    reserva.cancelar();
    await this.reservas.salvar(reserva);
    return paraReservaDTO(reserva);
  }
}

export class BuscarReservaUseCase {
  constructor(private readonly reservas: ReservaRepository) {}

  async executar(input: { idReserva: string; estabelecimentoId: string }): Promise<ReservaDTO> {
    const reserva = await this.reservas.buscarPorId(input.idReserva, input.estabelecimentoId);
    if (!reserva) {
      throw new ReservaNaoEncontradaError(input.idReserva);
    }
    return paraReservaDTO(reserva);
  }
}

export class ListarReservasUseCase {
  constructor(private readonly reservas: ReservaRepository) {}

  async executar(criterio: CriterioListagemReserva): Promise<ListaPaginadaDTO<ReservaDTO>> {
    const [itens, count] = await Promise.all([
      this.reservas.listar(criterio),
      this.reservas.contar(criterio),
    ]);
    return { count, model: itens.map(paraReservaDTO) };
  }
}
