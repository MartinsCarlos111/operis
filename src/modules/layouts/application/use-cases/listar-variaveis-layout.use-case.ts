import type { VariavelLayoutRepository } from '../../domain/repositories/variavel-layout.repository.js';
import { paraVariavelLayoutDTO, type VariavelLayoutDTO } from '../dtos/variavel-layout.dto.js';

export interface ListarVariaveisLayoutInput {
  startIndex: number;
  maxRows: number;
  termo?: string | undefined;
}

export interface ListaVariaveisLayoutDTO {
  count: number;
  model: VariavelLayoutDTO[];
}

export class ListarVariaveisLayoutUseCase {
  constructor(private readonly variaveis: VariavelLayoutRepository) {}

  async executar(input: ListarVariaveisLayoutInput): Promise<ListaVariaveisLayoutDTO> {
    const [variaveis, count] = await Promise.all([
      this.variaveis.listar(input),
      this.variaveis.contar(input.termo),
    ]);
    return { count, model: variaveis.map(paraVariavelLayoutDTO) };
  }
}
