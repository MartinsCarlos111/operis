import type { LayoutEtiquetaRepository } from '../../domain/repositories/layout-etiqueta.repository.js';
import {
  LayoutEtiquetaNaoEncontradoError,
  CodigoLayoutJaExisteError,
} from '../../domain/exceptions/erros.js';
import { paraLayoutEtiquetaDTO, type LayoutEtiquetaDTO } from '../dtos/layout-etiqueta.dto.js';

export interface EditarLayoutEtiquetaInput {
  idLayout: string;
  codigo: string;
  descricao: string;
  zpl?: string | undefined;
}

/** Edita um LayoutEtiqueta (404 se ausente; código único). */
export class EditarLayoutEtiquetaUseCase {
  constructor(private readonly layouts: LayoutEtiquetaRepository) {}

  async executar(input: EditarLayoutEtiquetaInput): Promise<LayoutEtiquetaDTO> {
    const layout = await this.layouts.buscarPorId(input.idLayout);
    if (!layout) {
      throw new LayoutEtiquetaNaoEncontradoError(input.idLayout);
    }

    const novoCodigo = input.codigo.trim();
    if (novoCodigo !== layout.codigo) {
      const colisao = await this.layouts.buscarPorCodigo(novoCodigo);
      if (colisao) {
        throw new CodigoLayoutJaExisteError(novoCodigo);
      }
    }

    layout.alterar({ codigo: input.codigo, descricao: input.descricao, zpl: input.zpl });
    await this.layouts.salvar(layout);
    return paraLayoutEtiquetaDTO(layout);
  }
}
