import type { OrdemProducao, StatusOrdemProducao } from '../../domain/entities/ordem-producao.js';
import type { OrdemProducaoRepository } from '../../domain/repositories/ordem-producao.repositories.js';
import { AppError } from '@shared/errors/app-error.js';
import { paraOrdemProducaoDTO, type OrdemProducaoDTO } from '../dtos/manufatura.dtos.js';

export class OrdensNaoAtendemCondicaoError extends AppError {
  readonly code = 'ORDEM_NAO_ATENDE_CONDICAO';
  readonly httpStatus = 422;
  constructor(mensagem: string) {
    super(mensagem);
  }
}

/**
 * Libera ordens pendentes (NAO_LIBERADA/RECUSADA) — paridade com
 * `LiberarOrdensProducao` do legado. Ordem já LIBERADA é idempotente.
 */
export class LiberarOrdensProducaoUseCase {
  constructor(private readonly ordens: OrdemProducaoRepository) {}

  async executar(input: {
    estabelecimentoId: string;
    idsOrdensProducao: ReadonlyArray<string>;
    usuarioId: string;
  }): Promise<OrdemProducaoDTO[]> {
    void input.usuarioId;
    const liberadas: OrdemProducao[] = [];
    for (const id of input.idsOrdensProducao) {
      const ordem = await this.ordens.buscarPorId(id, input.estabelecimentoId);
      if (!ordem) throw new OrdensNaoAtendemCondicaoError(`Ordem '${id}' não encontrada.`);
      const status = ordem.status as StatusOrdemProducao;
      if (status === 'NAO_LIBERADA' || status === 'RECUSADA') {
        ordem.alterarStatus('LIBERADA');
        await this.ordens.salvar(ordem);
      }
      liberadas.push(ordem);
    }
    return liberadas.map(paraOrdemProducaoDTO);
  }
}

/**
 * Cancela ordens — paridade com `CancelarOrdensProducao`. Recusa cancelar
 * ordens já iniciadas/concluídas/baixadas (paridade com o legado).
 */
export class CancelarOrdensProducaoUseCase {
  constructor(private readonly ordens: OrdemProducaoRepository) {}

  async executar(input: {
    estabelecimentoId: string;
    idsOrdensProducao: ReadonlyArray<string>;
    motivo?: string | undefined;
  }): Promise<OrdemProducaoDTO[]> {
    const canceladas: OrdemProducao[] = [];
    for (const id of input.idsOrdensProducao) {
      const ordem = await this.ordens.buscarPorId(id, input.estabelecimentoId);
      if (!ordem) throw new OrdensNaoAtendemCondicaoError(`Ordem '${id}' não encontrada.`);
      const status = ordem.status as StatusOrdemProducao;
      if (status === 'INICIADA' || status === 'CONCLUIDA' || status === 'BAIXADA') {
        throw new OrdensNaoAtendemCondicaoError(`Ordem '${id}' com status '${status}' não pode ser cancelada.`);
      }
      ordem.alterarStatus('CANCELADA');
      if (input.motivo) ordem.anexarObservacao(input.motivo);
      await this.ordens.salvar(ordem);
      canceladas.push(ordem);
    }
    return canceladas.map(paraOrdemProducaoDTO);
  }
}

/**
 * Baixa ordens — paridade com `BaixarOrdensProducao`. SóCONCLUIDA baixa;
 * BAIXADA é idempotente. A confirmação ao ERP é responsabilidade do módulo
 * `integracao-erp` (SOAP).
 */
export class BaixarOrdensProducaoUseCase {
  constructor(private readonly ordens: OrdemProducaoRepository) {}

  async executar(input: {
    estabelecimentoId: string;
    idsOrdensProducao: ReadonlyArray<string>;
    usuarioId: string;
  }): Promise<OrdemProducaoDTO[]> {
    void input.usuarioId;
    const baixadas: OrdemProducao[] = [];
    for (const id of input.idsOrdensProducao) {
      const ordem = await this.ordens.buscarPorId(id, input.estabelecimentoId);
      if (!ordem) throw new OrdensNaoAtendemCondicaoError(`Ordem '${id}' não encontrada.`);
      const status = ordem.status as StatusOrdemProducao;
      if (status !== 'CONCLUIDA' && status !== 'BAIXADA') {
        throw new OrdensNaoAtendemCondicaoError(`Ordem '${id}' precisa estar CONCLUIDA para baixar (atual: ${status}).`);
      }
      ordem.alterarStatus('BAIXADA');
      await this.ordens.salvar(ordem);
      baixadas.push(ordem);
    }
    return baixadas.map(paraOrdemProducaoDTO);
  }
}

/**
 * Marca ordens LIBERADAS para INICIADA — paridade com a abertura de ordem no
 * terminal (`BuscarOrdemProducaoTerminal` que abre a nova ordem do turno).
 */
export class IniciarOrdemProducaoUseCase {
  constructor(private readonly ordens: OrdemProducaoRepository) {}

  async executar(input: { idOrdemProducao: string; estabelecimentoId: string }): Promise<OrdemProducaoDTO> {
    const ordem = await this.ordens.buscarPorId(input.idOrdemProducao, input.estabelecimentoId);
    if (!ordem) throw new OrdensNaoAtendemCondicaoError(`Ordem '${input.idOrdemProducao}' não encontrada.`);
    const status = ordem.status as StatusOrdemProducao;
    if (status !== 'LIBERADA' && status !== 'INICIADA') {
      throw new OrdensNaoAtendemCondicaoError(`Ordem '${input.idOrdemProducao}' precisa estar LIBERADA para iniciar (atual: ${status}).`);
    }
    ordem.alterarStatus('INICIADA');
    await this.ordens.salvar(ordem);
    return paraOrdemProducaoDTO(ordem);
  }
}