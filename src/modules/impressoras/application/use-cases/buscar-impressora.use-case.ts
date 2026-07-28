import type { ImpressoraRepository } from '../../domain/repositories/impressora.repository.js';
import { ImpressoraNaoEncontradaError } from '../../domain/exceptions/impressora-nao-encontrada.error.js';
import { paraImpressoraDTO, type ImpressoraDTO } from '../dtos/impressora.dto.js';

export interface BuscarImpressoraInput {
  idImpressora: string;
}

/**
 * Busca uma Impressora por id. Paridade com ImpressoraController.GetImpressora,
 * que retorna 404 quando não encontra.
 */
export class BuscarImpressoraUseCase {
  constructor(private readonly impressoras: ImpressoraRepository) {}

  async executar(input: BuscarImpressoraInput): Promise<ImpressoraDTO> {
    const impressora = await this.impressoras.buscarPorId(input.idImpressora);
    if (!impressora) {
      throw new ImpressoraNaoEncontradaError(input.idImpressora);
    }
    return paraImpressoraDTO(impressora);
  }
}
