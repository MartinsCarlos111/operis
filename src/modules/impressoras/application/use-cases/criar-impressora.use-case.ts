import { Impressora } from '../../domain/entities/impressora.js';
import type { ImpressoraRepository } from '../../domain/repositories/impressora.repository.js';
import type { GeradorId } from '@shared/domain/gerador-id.js';
import { CodigoImpressoraJaExisteError } from '../../domain/exceptions/codigo-impressora-ja-existe.error.js';
import { paraImpressoraDTO, type ImpressoraDTO } from '../dtos/impressora.dto.js';

export interface CriarImpressoraInput {
  codigo: string;
  descricao: string;
  endereco: string;
}

/**
 * Cria uma Impressora. Preserva ImpressoraRN.AdicionarImpressora + Validar:
 *   1. código/descrição/endereço obrigatórios  (Impressora.criar)
 *   2. código único no tenant
 */
export class CriarImpressoraUseCase {
  constructor(
    private readonly impressoras: ImpressoraRepository,
    private readonly ids: GeradorId,
  ) {}

  async executar(input: CriarImpressoraInput): Promise<ImpressoraDTO> {
    const impressora = Impressora.criar({
      idImpressora: this.ids.gerar(),
      codigo: input.codigo,
      descricao: input.descricao,
      endereco: input.endereco,
    });

    const existente = await this.impressoras.buscarPorCodigo(impressora.codigo);
    if (existente) {
      throw new CodigoImpressoraJaExisteError(impressora.codigo);
    }

    await this.impressoras.salvar(impressora);
    return paraImpressoraDTO(impressora);
  }
}
