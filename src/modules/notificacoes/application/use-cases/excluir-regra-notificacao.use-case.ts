import type { RegraNotificacaoRepository } from '../../domain/repositories/regra-notificacao.repository.js';
import { RegraNotificacaoNaoEncontradaError } from '../../domain/exceptions/regra-notificacao-nao-encontrada.error.js';

export interface ExcluirRegraNotificacaoInput {
  idRegraNotificacao: string;
}

/**
 * Exclui uma Regra de Notificação. Preserva RegraNotificacaoRN.Excluir:
 *   1. regra existe  → senão 404
 *   2. exclui (as condições filhas caem por cascade)
 */
export class ExcluirRegraNotificacaoUseCase {
  constructor(private readonly regras: RegraNotificacaoRepository) {}

  async executar(input: ExcluirRegraNotificacaoInput): Promise<void> {
    const regra = await this.regras.buscarPorId(input.idRegraNotificacao);
    if (!regra) {
      throw new RegraNotificacaoNaoEncontradaError(input.idRegraNotificacao);
    }
    await this.regras.excluir(input.idRegraNotificacao);
  }
}
