import type { VariavelLayoutRepository } from '../../domain/repositories/variavel-layout.repository.js';
import { VariavelLayoutNaoEncontradaError } from '../../domain/exceptions/erros.js';

export interface ExcluirVariavelLayoutInput {
  idVariavel: string;
}

/** Exclui uma VariavelLayout (404 se ausente). */
export class ExcluirVariavelLayoutUseCase {
  constructor(private readonly variaveis: VariavelLayoutRepository) {}

  async executar(input: ExcluirVariavelLayoutInput): Promise<void> {
    const variavel = await this.variaveis.buscarPorId(input.idVariavel);
    if (!variavel) {
      throw new VariavelLayoutNaoEncontradaError(input.idVariavel);
    }
    await this.variaveis.excluir(input.idVariavel);
  }
}
