import type { AreaRepository } from '../../domain/repositories/area.repository.js';
import { paraAreaDTO, type AreaDTO } from '../dtos/area.dto.js';

export interface ListarAreasInput {
  estabelecimentoId: string;
  startIndex: number;
  maxRows: number;
  /** Busca textual opcional (código/descrição). Substitui jsonConditions. */
  termo?: string | undefined;
}

/**
 * Resultado paginado, na mesma forma do AreaController.GetAreas legado:
 * `{ count, model }` — count é o total do filtro (não da página).
 */
export interface ListaAreasDTO {
  count: number;
  model: AreaDTO[];
}

export class ListarAreasUseCase {
  constructor(private readonly areas: AreaRepository) {}

  async executar(input: ListarAreasInput): Promise<ListaAreasDTO> {
    const [areas, count] = await Promise.all([
      this.areas.listar({
        estabelecimentoId: input.estabelecimentoId,
        startIndex: input.startIndex,
        maxRows: input.maxRows,
        termo: input.termo,
      }),
      this.areas.contar(input.estabelecimentoId, input.termo),
    ]);

    return { count, model: areas.map(paraAreaDTO) };
  }
}
