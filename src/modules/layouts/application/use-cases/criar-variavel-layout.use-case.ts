import { VariavelLayout } from '../../domain/entities/variavel-layout.js';
import type { VariavelLayoutRepository } from '../../domain/repositories/variavel-layout.repository.js';
import type { GeradorId } from '@shared/domain/gerador-id.js';
import { CodigoVariavelJaExisteError } from '../../domain/exceptions/erros.js';
import { paraVariavelLayoutDTO, type VariavelLayoutDTO } from '../dtos/variavel-layout.dto.js';

export interface CriarVariavelLayoutInput {
  codigo: string;
  descricao: string;
  campoEtiquetaManufatura?: string | undefined;
  campoEtiquetaColetores?: string | undefined;
}

/** Cria uma VariavelLayout. Preserva AdicionarVariavelLayout + Validar. */
export class CriarVariavelLayoutUseCase {
  constructor(
    private readonly variaveis: VariavelLayoutRepository,
    private readonly ids: GeradorId,
  ) {}

  async executar(input: CriarVariavelLayoutInput): Promise<VariavelLayoutDTO> {
    const variavel = VariavelLayout.criar({ idVariavel: this.ids.gerar(), ...input });

    const existente = await this.variaveis.buscarPorCodigo(variavel.codigo);
    if (existente) {
      throw new CodigoVariavelJaExisteError(variavel.codigo);
    }

    await this.variaveis.salvar(variavel);
    return paraVariavelLayoutDTO(variavel);
  }
}
