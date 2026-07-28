import type { CrachaRepository } from '../../domain/repositories/cracha.repository.js';
import { CrachaNaoEncontradoError } from '../../domain/exceptions/cracha-nao-encontrado.error.js';
import { paraCrachaDTO, type CrachaDTO } from '../dtos/cracha.dto.js';

export interface BuscarCrachaInput {
  idCracha: string;
}

/** Busca um crachá por id (404 se ausente) — paridade com GetCracha. */
export class BuscarCrachaUseCase {
  constructor(private readonly crachas: CrachaRepository) {}

  async executar(input: BuscarCrachaInput): Promise<CrachaDTO> {
    const cracha = await this.crachas.buscarPorId(input.idCracha);
    if (!cracha) {
      throw new CrachaNaoEncontradoError(input.idCracha);
    }
    return paraCrachaDTO(cracha);
  }
}
