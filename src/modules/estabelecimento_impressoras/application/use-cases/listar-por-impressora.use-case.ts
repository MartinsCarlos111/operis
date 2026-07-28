import type { EstabelecimentoImpressoraRepository } from '../../domain/repositories/estabelecimento-impressora.repository.js';
import {
  paraEstabelecimentoImpressoraDTO,
  type EstabelecimentoImpressoraDTO,
} from '../dtos/estabelecimento-impressora.dto.js';
import type { ListaVinculosDTO } from './listar-por-estabelecimento.use-case.js';

export interface ListarPorImpressoraInput {
  impressoraId: string;
}

/** Estabelecimentos vinculados a uma impressora (paridade com
 * GetEstabelecimentoImpressoraByImpressora → `{ model }`). */
export class ListarPorImpressoraUseCase {
  constructor(private readonly vinculos: EstabelecimentoImpressoraRepository) {}

  async executar(input: ListarPorImpressoraInput): Promise<ListaVinculosDTO> {
    const vinculos = await this.vinculos.listarPorImpressora(input.impressoraId);
    return { model: vinculos.map(paraEstabelecimentoImpressoraDTO) };
  }
}
