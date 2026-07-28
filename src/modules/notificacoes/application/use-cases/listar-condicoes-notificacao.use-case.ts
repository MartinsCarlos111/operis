import type { CondicaoNotificacaoRepository } from '../../domain/repositories/condicao-notificacao.repository.js';
import {
  paraCondicaoNotificacaoDTO,
  type CondicaoNotificacaoDTO,
} from '../dtos/condicao-notificacao.dto.js';

export interface ListarCondicoesNotificacaoInput {
  idRegraNotificacao: string;
}

/**
 * Lista as condições de uma regra, na forma `{ count, model }` do
 * CondicaoNotificacaoController.GetCondicoesRegras legado.
 */
export interface ListaCondicoesNotificacaoDTO {
  count: number;
  model: CondicaoNotificacaoDTO[];
}

export class ListarCondicoesNotificacaoUseCase {
  constructor(private readonly condicoes: CondicaoNotificacaoRepository) {}

  async executar(input: ListarCondicoesNotificacaoInput): Promise<ListaCondicoesNotificacaoDTO> {
    const [condicoes, count] = await Promise.all([
      this.condicoes.listarPorRegra(input.idRegraNotificacao),
      this.condicoes.contarPorRegra(input.idRegraNotificacao),
    ]);

    return { count, model: condicoes.map(paraCondicaoNotificacaoDTO) };
  }
}
