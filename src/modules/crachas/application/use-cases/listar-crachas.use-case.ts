import type { CrachaRepository } from '../../domain/repositories/cracha.repository.js';
import { paraCrachaDTO, type CrachaDTO } from '../dtos/cracha.dto.js';

export interface ListarCrachasInput {
  startIndex: number;
  maxRows: number;
  termo?: string | undefined;
}

/** Resultado paginado `{ count, model }` — paridade com GetCrachas. */
export interface ListaCrachasDTO {
  count: number;
  model: CrachaDTO[];
}

export class ListarCrachasUseCase {
  constructor(private readonly crachas: CrachaRepository) {}

  async executar(input: ListarCrachasInput): Promise<ListaCrachasDTO> {
    const [crachas, count] = await Promise.all([
      this.crachas.listar({
        startIndex: input.startIndex,
        maxRows: input.maxRows,
        termo: input.termo,
      }),
      this.crachas.contar(input.termo),
    ]);

    return { count, model: crachas.map(paraCrachaDTO) };
  }
}
