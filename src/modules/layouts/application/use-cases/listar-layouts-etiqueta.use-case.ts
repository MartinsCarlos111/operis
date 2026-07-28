import type { LayoutEtiquetaRepository } from '../../domain/repositories/layout-etiqueta.repository.js';
import { paraLayoutEtiquetaDTO, type LayoutEtiquetaDTO } from '../dtos/layout-etiqueta.dto.js';

export interface ListarLayoutsEtiquetaInput {
  startIndex: number;
  maxRows: number;
  termo?: string | undefined;
}

export interface ListaLayoutsEtiquetaDTO {
  count: number;
  model: LayoutEtiquetaDTO[];
}

export class ListarLayoutsEtiquetaUseCase {
  constructor(private readonly layouts: LayoutEtiquetaRepository) {}

  async executar(input: ListarLayoutsEtiquetaInput): Promise<ListaLayoutsEtiquetaDTO> {
    const [layouts, count] = await Promise.all([
      this.layouts.listar(input),
      this.layouts.contar(input.termo),
    ]);
    return { count, model: layouts.map(paraLayoutEtiquetaDTO) };
  }
}
