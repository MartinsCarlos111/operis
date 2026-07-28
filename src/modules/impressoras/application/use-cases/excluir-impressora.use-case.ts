import type { ImpressoraRepository } from '../../domain/repositories/impressora.repository.js';
import { ImpressoraNaoEncontradaError } from '../../domain/exceptions/impressora-nao-encontrada.error.js';

export interface ExcluirImpressoraInput {
  idImpressora: string;
}

/**
 * Exclui uma Impressora. Preserva ImpressoraRN.ExcluirImpressoras:
 *   1. impressora existe  → senão 404
 *   2. exclui
 *
 * (O legado não bloqueia exclusão por vínculo; o vínculo com estabelecimento
 * vive em EstabelecimentoImpressora, cuja FK trata a integridade quando for
 * migrado.)
 */
export class ExcluirImpressoraUseCase {
  constructor(private readonly impressoras: ImpressoraRepository) {}

  async executar(input: ExcluirImpressoraInput): Promise<void> {
    const impressora = await this.impressoras.buscarPorId(input.idImpressora);
    if (!impressora) {
      throw new ImpressoraNaoEncontradaError(input.idImpressora);
    }
    await this.impressoras.excluir(input.idImpressora);
  }
}
