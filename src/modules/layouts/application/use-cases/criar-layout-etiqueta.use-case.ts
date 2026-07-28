import { LayoutEtiqueta } from '../../domain/entities/layout-etiqueta.js';
import type { LayoutEtiquetaRepository } from '../../domain/repositories/layout-etiqueta.repository.js';
import type { GeradorId } from '@shared/domain/gerador-id.js';
import { CodigoLayoutJaExisteError } from '../../domain/exceptions/erros.js';
import { paraLayoutEtiquetaDTO, type LayoutEtiquetaDTO } from '../dtos/layout-etiqueta.dto.js';

export interface CriarLayoutEtiquetaInput {
  codigo: string;
  descricao: string;
  zpl?: string | undefined;
}

/** Cria um LayoutEtiqueta. Código/descrição obrigatórios; código único. */
export class CriarLayoutEtiquetaUseCase {
  constructor(
    private readonly layouts: LayoutEtiquetaRepository,
    private readonly ids: GeradorId,
  ) {}

  async executar(input: CriarLayoutEtiquetaInput): Promise<LayoutEtiquetaDTO> {
    const layout = LayoutEtiqueta.criar({ idLayout: this.ids.gerar(), ...input });

    const existente = await this.layouts.buscarPorCodigo(layout.codigo);
    if (existente) {
      throw new CodigoLayoutJaExisteError(layout.codigo);
    }

    await this.layouts.salvar(layout);
    return paraLayoutEtiquetaDTO(layout);
  }
}
