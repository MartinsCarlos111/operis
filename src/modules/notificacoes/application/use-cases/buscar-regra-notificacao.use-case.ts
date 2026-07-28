import type { RegraNotificacaoRepository } from '../../domain/repositories/regra-notificacao.repository.js';
import { RegraNotificacaoNaoEncontradaError } from '../../domain/exceptions/regra-notificacao-nao-encontrada.error.js';
import { paraRegraNotificacaoDTO, type RegraNotificacaoDTO } from '../dtos/regra-notificacao.dto.js';

export interface BuscarRegraNotificacaoInput {
  idRegraNotificacao: string;
}

/** Busca uma regra por id (404 se ausente) — paridade com GetRegraNotificacao. */
export class BuscarRegraNotificacaoUseCase {
  constructor(private readonly regras: RegraNotificacaoRepository) {}

  async executar(input: BuscarRegraNotificacaoInput): Promise<RegraNotificacaoDTO> {
    const regra = await this.regras.buscarPorId(input.idRegraNotificacao);
    if (!regra) {
      throw new RegraNotificacaoNaoEncontradaError(input.idRegraNotificacao);
    }
    return paraRegraNotificacaoDTO(regra);
  }
}
