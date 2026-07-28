import { EstabelecimentoImpressora } from '../../domain/entities/estabelecimento-impressora.js';
import type { EstabelecimentoImpressoraRepository } from '../../domain/repositories/estabelecimento-impressora.repository.js';
import type {
  VerificadorEstabelecimento,
  VerificadorImpressora,
} from '../../domain/gateways/verificadores.js';
import { VinculoJaExisteError } from '../../domain/exceptions/vinculo-ja-existe.error.js';
import {
  EstabelecimentoInexistenteError,
  ImpressoraInexistenteError,
} from '../../domain/exceptions/referencia-invalida.error.js';
import {
  paraEstabelecimentoImpressoraDTO,
  type EstabelecimentoImpressoraDTO,
} from '../dtos/estabelecimento-impressora.dto.js';

export interface VincularImpressoraInput {
  estabelecimentoId: string;
  impressoraId: string;
}

/**
 * Vincula uma impressora a um estabelecimento. Preserva
 * EstabelecimentoImpressoraRN.Adicionar + Validar:
 *   1. impressora existe
 *   2. estabelecimento existe
 *   3. o par ainda não está vinculado
 */
export class VincularImpressoraUseCase {
  constructor(
    private readonly vinculos: EstabelecimentoImpressoraRepository,
    private readonly estabelecimentos: VerificadorEstabelecimento,
    private readonly impressoras: VerificadorImpressora,
  ) {}

  async executar(input: VincularImpressoraInput): Promise<EstabelecimentoImpressoraDTO> {
    if (!(await this.impressoras.existe(input.impressoraId))) {
      throw new ImpressoraInexistenteError(input.impressoraId);
    }
    if (!(await this.estabelecimentos.existe(input.estabelecimentoId))) {
      throw new EstabelecimentoInexistenteError(input.estabelecimentoId);
    }

    const existente = await this.vinculos.buscar(input.estabelecimentoId, input.impressoraId);
    if (existente) {
      throw new VinculoJaExisteError(input.estabelecimentoId, input.impressoraId);
    }

    const vinculo = EstabelecimentoImpressora.criar({
      estabelecimentoId: input.estabelecimentoId,
      impressoraId: input.impressoraId,
    });
    await this.vinculos.salvar(vinculo);
    return paraEstabelecimentoImpressoraDTO(vinculo);
  }
}
