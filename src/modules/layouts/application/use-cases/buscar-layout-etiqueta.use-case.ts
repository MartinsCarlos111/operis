import type { LayoutEtiquetaRepository } from '../../domain/repositories/layout-etiqueta.repository.js';
import { LayoutEtiquetaNaoEncontradoError } from '../../domain/exceptions/erros.js';
import { paraLayoutEtiquetaDTO, type LayoutEtiquetaDTO } from '../dtos/layout-etiqueta.dto.js';

export interface BuscarLayoutEtiquetaInput {
  idLayout: string;
}

/** Busca um LayoutEtiqueta por id (404 se ausente). */
export class BuscarLayoutEtiquetaUseCase {
  constructor(private readonly layouts: LayoutEtiquetaRepository) {}

  async executar(input: BuscarLayoutEtiquetaInput): Promise<LayoutEtiquetaDTO> {
    const layout = await this.layouts.buscarPorId(input.idLayout);
    if (!layout) {
      throw new LayoutEtiquetaNaoEncontradoError(input.idLayout);
    }
    return paraLayoutEtiquetaDTO(layout);
  }
}
