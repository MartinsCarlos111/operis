import type { ImpressoraRepository } from '../../domain/repositories/impressora.repository.js';
import { paraImpressoraDTO, type ImpressoraDTO } from '../dtos/impressora.dto.js';

export interface ListarImpressorasInput {
  startIndex: number;
  maxRows: number;
  termo?: string | undefined;
}

/**
 * Resultado paginado, na forma do ImpressoraController.GetImpressoras legado:
 * `{ count, model }` — count é o total do filtro (não da página).
 */
export interface ListaImpressorasDTO {
  count: number;
  model: ImpressoraDTO[];
}

export class ListarImpressorasUseCase {
  constructor(private readonly impressoras: ImpressoraRepository) {}

  async executar(input: ListarImpressorasInput): Promise<ListaImpressorasDTO> {
    const [impressoras, count] = await Promise.all([
      this.impressoras.listar({
        startIndex: input.startIndex,
        maxRows: input.maxRows,
        termo: input.termo,
      }),
      this.impressoras.contar(input.termo),
    ]);

    return { count, model: impressoras.map(paraImpressoraDTO) };
  }
}
