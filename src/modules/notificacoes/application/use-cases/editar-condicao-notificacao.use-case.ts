import type { CondicaoNotificacaoRepository } from '../../domain/repositories/condicao-notificacao.repository.js';
import { CondicaoNotificacaoNaoEncontradaError } from '../../domain/exceptions/condicao-notificacao-nao-encontrada.error.js';
import {
  paraCondicaoNotificacaoDTO,
  type CondicaoNotificacaoDTO,
} from '../dtos/condicao-notificacao.dto.js';

export interface EditarCondicaoNotificacaoInput {
  idCondicaoNotificacao: string;
  campo: string;
  operador: string;
  valor?: string | undefined;
}

/** Edita uma Condição existente (404 se ausente). */
export class EditarCondicaoNotificacaoUseCase {
  constructor(private readonly condicoes: CondicaoNotificacaoRepository) {}

  async executar(input: EditarCondicaoNotificacaoInput): Promise<CondicaoNotificacaoDTO> {
    const condicao = await this.condicoes.buscarPorId(input.idCondicaoNotificacao);
    if (!condicao) {
      throw new CondicaoNotificacaoNaoEncontradaError(input.idCondicaoNotificacao);
    }

    condicao.alterar({ campo: input.campo, operador: input.operador, valor: input.valor });
    await this.condicoes.salvar(condicao);
    return paraCondicaoNotificacaoDTO(condicao);
  }
}
