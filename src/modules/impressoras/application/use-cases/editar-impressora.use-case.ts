import type { ImpressoraRepository } from '../../domain/repositories/impressora.repository.js';
import { ImpressoraNaoEncontradaError } from '../../domain/exceptions/impressora-nao-encontrada.error.js';
import { CodigoImpressoraJaExisteError } from '../../domain/exceptions/codigo-impressora-ja-existe.error.js';
import { paraImpressoraDTO, type ImpressoraDTO } from '../dtos/impressora.dto.js';

export interface EditarImpressoraInput {
  idImpressora: string;
  codigo: string;
  descricao: string;
  endereco: string;
}

/**
 * Edita uma Impressora. Preserva ImpressoraRN.EditarImpressora + Validar:
 *   1. campos obrigatórios  (Impressora.alterar)
 *   2. impressora existe
 *   3. se o código mudou, o novo não pode colidir com outra impressora
 */
export class EditarImpressoraUseCase {
  constructor(private readonly impressoras: ImpressoraRepository) {}

  async executar(input: EditarImpressoraInput): Promise<ImpressoraDTO> {
    const impressora = await this.impressoras.buscarPorId(input.idImpressora);
    if (!impressora) {
      throw new ImpressoraNaoEncontradaError(input.idImpressora);
    }

    const novoCodigo = input.codigo.trim();
    if (novoCodigo !== impressora.codigo) {
      const colisao = await this.impressoras.buscarPorCodigo(novoCodigo);
      if (colisao) {
        throw new CodigoImpressoraJaExisteError(novoCodigo);
      }
    }

    impressora.alterar({
      codigo: input.codigo,
      descricao: input.descricao,
      endereco: input.endereco,
    });
    await this.impressoras.salvar(impressora);
    return paraImpressoraDTO(impressora);
  }
}
