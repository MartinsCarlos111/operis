import type { VariavelLayoutRepository } from '../../domain/repositories/variavel-layout.repository.js';
import { VariavelLayoutNaoEncontradaError } from '../../domain/exceptions/erros.js';
import { paraVariavelLayoutDTO, type VariavelLayoutDTO } from '../dtos/variavel-layout.dto.js';

export interface BuscarVariavelLayoutInput {
  idVariavel: string;
}

/** Busca uma VariavelLayout por id (404 se ausente). */
export class BuscarVariavelLayoutUseCase {
  constructor(private readonly variaveis: VariavelLayoutRepository) {}

  async executar(input: BuscarVariavelLayoutInput): Promise<VariavelLayoutDTO> {
    const variavel = await this.variaveis.buscarPorId(input.idVariavel);
    if (!variavel) {
      throw new VariavelLayoutNaoEncontradaError(input.idVariavel);
    }
    return paraVariavelLayoutDTO(variavel);
  }
}
