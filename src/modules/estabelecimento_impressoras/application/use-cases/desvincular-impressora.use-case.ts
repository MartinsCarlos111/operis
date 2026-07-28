import type { EstabelecimentoImpressoraRepository } from '../../domain/repositories/estabelecimento-impressora.repository.js';
import { VinculoNaoEncontradoError } from '../../domain/exceptions/vinculo-nao-encontrado.error.js';

export interface DesvincularImpressoraInput {
  estabelecimentoId: string;
  impressoraId: string;
}

/**
 * Remove o vínculo estabelecimento ↔ impressora (paridade com
 * DeleteEstabelecimentoImpressora, por par). 404 se o vínculo não existe.
 */
export class DesvincularImpressoraUseCase {
  constructor(private readonly vinculos: EstabelecimentoImpressoraRepository) {}

  async executar(input: DesvincularImpressoraInput): Promise<void> {
    const vinculo = await this.vinculos.buscar(input.estabelecimentoId, input.impressoraId);
    if (!vinculo) {
      throw new VinculoNaoEncontradoError(input.estabelecimentoId, input.impressoraId);
    }
    await this.vinculos.excluir(input.estabelecimentoId, input.impressoraId);
  }
}
