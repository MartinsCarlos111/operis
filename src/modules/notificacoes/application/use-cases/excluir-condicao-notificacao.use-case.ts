import type { CondicaoNotificacaoRepository } from '../../domain/repositories/condicao-notificacao.repository.js';
import { CondicaoNotificacaoNaoEncontradaError } from '../../domain/exceptions/condicao-notificacao-nao-encontrada.error.js';

export interface ExcluirCondicaoNotificacaoInput {
  idCondicaoNotificacao: string;
}

/** Exclui uma Condição (404 se ausente). */
export class ExcluirCondicaoNotificacaoUseCase {
  constructor(private readonly condicoes: CondicaoNotificacaoRepository) {}

  async executar(input: ExcluirCondicaoNotificacaoInput): Promise<void> {
    const condicao = await this.condicoes.buscarPorId(input.idCondicaoNotificacao);
    if (!condicao) {
      throw new CondicaoNotificacaoNaoEncontradaError(input.idCondicaoNotificacao);
    }
    await this.condicoes.excluir(input.idCondicaoNotificacao);
  }
}
