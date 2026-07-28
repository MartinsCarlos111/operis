import type { EstabelecimentoImpressoraRepository } from '../../domain/repositories/estabelecimento-impressora.repository.js';
import {
  paraEstabelecimentoImpressoraDTO,
  type EstabelecimentoImpressoraDTO,
} from '../dtos/estabelecimento-impressora.dto.js';

export interface ListarPorEstabelecimentoInput {
  estabelecimentoId: string;
}

/** Impressoras vinculadas a um estabelecimento (paridade com
 * GetEstabelecimentoImpressoraByEstabelecimento → `{ model }`). */
export interface ListaVinculosDTO {
  model: EstabelecimentoImpressoraDTO[];
}

export class ListarPorEstabelecimentoUseCase {
  constructor(private readonly vinculos: EstabelecimentoImpressoraRepository) {}

  async executar(input: ListarPorEstabelecimentoInput): Promise<ListaVinculosDTO> {
    const vinculos = await this.vinculos.listarPorEstabelecimento(input.estabelecimentoId);
    return { model: vinculos.map(paraEstabelecimentoImpressoraDTO) };
  }
}
