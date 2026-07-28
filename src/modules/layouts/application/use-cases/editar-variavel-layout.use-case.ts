import type { VariavelLayoutRepository } from '../../domain/repositories/variavel-layout.repository.js';
import {
  VariavelLayoutNaoEncontradaError,
  CodigoVariavelJaExisteError,
} from '../../domain/exceptions/erros.js';
import { paraVariavelLayoutDTO, type VariavelLayoutDTO } from '../dtos/variavel-layout.dto.js';

export interface EditarVariavelLayoutInput {
  idVariavel: string;
  codigo: string;
  descricao: string;
  campoEtiquetaManufatura?: string | undefined;
  campoEtiquetaColetores?: string | undefined;
}

/** Edita uma VariavelLayout. Preserva EditarVariavelLayout + Validar. */
export class EditarVariavelLayoutUseCase {
  constructor(private readonly variaveis: VariavelLayoutRepository) {}

  async executar(input: EditarVariavelLayoutInput): Promise<VariavelLayoutDTO> {
    const variavel = await this.variaveis.buscarPorId(input.idVariavel);
    if (!variavel) {
      throw new VariavelLayoutNaoEncontradaError(input.idVariavel);
    }

    const novoCodigo = input.codigo.trim();
    if (novoCodigo !== variavel.codigo) {
      const colisao = await this.variaveis.buscarPorCodigo(novoCodigo);
      if (colisao) {
        throw new CodigoVariavelJaExisteError(novoCodigo);
      }
    }

    variavel.alterar({
      codigo: input.codigo,
      descricao: input.descricao,
      campoEtiquetaManufatura: input.campoEtiquetaManufatura,
      campoEtiquetaColetores: input.campoEtiquetaColetores,
    });
    await this.variaveis.salvar(variavel);
    return paraVariavelLayoutDTO(variavel);
  }
}
