import type { LayoutEtiquetaRepository } from '../../domain/repositories/layout-etiqueta.repository.js';
import { LayoutEtiquetaNaoEncontradoError } from '../../domain/exceptions/erros.js';

export interface ExcluirLayoutEtiquetaInput {
  idLayout: string;
}

/** Exclui um LayoutEtiqueta (404 se ausente). */
export class ExcluirLayoutEtiquetaUseCase {
  constructor(private readonly layouts: LayoutEtiquetaRepository) {}

  async executar(input: ExcluirLayoutEtiquetaInput): Promise<void> {
    const layout = await this.layouts.buscarPorId(input.idLayout);
    if (!layout) {
      throw new LayoutEtiquetaNaoEncontradoError(input.idLayout);
    }
    await this.layouts.excluir(input.idLayout);
  }
}
