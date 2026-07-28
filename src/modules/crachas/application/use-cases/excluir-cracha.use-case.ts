import type { CrachaRepository } from '../../domain/repositories/cracha.repository.js';
import { CrachaNaoEncontradoError } from '../../domain/exceptions/cracha-nao-encontrado.error.js';

export interface ExcluirCrachaInput {
  idCracha: string;
}

/**
 * Exclui um Crachá (e suas digitais, por cascade). Retorna 404 se ausente
 * (o C# não validava existência no delete; aqui damos um erro claro).
 */
export class ExcluirCrachaUseCase {
  constructor(private readonly crachas: CrachaRepository) {}

  async executar(input: ExcluirCrachaInput): Promise<void> {
    const cracha = await this.crachas.buscarPorId(input.idCracha);
    if (!cracha) {
      throw new CrachaNaoEncontradoError(input.idCracha);
    }
    await this.crachas.excluir(input.idCracha);
  }
}
