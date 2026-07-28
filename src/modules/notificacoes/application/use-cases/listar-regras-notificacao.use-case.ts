import type { RegraNotificacaoRepository } from '../../domain/repositories/regra-notificacao.repository.js';
import { paraRegraNotificacaoDTO, type RegraNotificacaoDTO } from '../dtos/regra-notificacao.dto.js';

export interface ListarRegrasNotificacaoInput {
  startIndex: number;
  maxRows: number;
  termo?: string | undefined;
}

/** Resultado paginado `{ count, model }` — paridade com GetRegrasNotificacao. */
export interface ListaRegrasNotificacaoDTO {
  count: number;
  model: RegraNotificacaoDTO[];
}

export class ListarRegrasNotificacaoUseCase {
  constructor(private readonly regras: RegraNotificacaoRepository) {}

  async executar(input: ListarRegrasNotificacaoInput): Promise<ListaRegrasNotificacaoDTO> {
    const [regras, count] = await Promise.all([
      this.regras.listar({
        startIndex: input.startIndex,
        maxRows: input.maxRows,
        termo: input.termo,
      }),
      this.regras.contar(input.termo),
    ]);

    return { count, model: regras.map(paraRegraNotificacaoDTO) };
  }
}
