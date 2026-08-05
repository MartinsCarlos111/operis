import type { EstabelecimentoRepository } from '../../domain/repositories/estabelecimento.repository.js';
import { EstabelecimentoNaoEncontradoError } from '../../domain/exceptions/estabelecimento-nao-encontrado.error.js';
import { paraEstabelecimentoDTO, type EstabelecimentoDTO } from '../dtos/estabelecimento.dto.js';

/**
 * Busca um estabelecimento por id, no banco do tenant. 404 quando não existe —
 * mesma semântica de BuscarAreaUseCase.
 *
 * Não há escopo por estabelecimento ativo aqui (diferente de Áreas): o
 * estabelecimento É o escopo, e quem administra o tenant enxerga todos.
 */
export class BuscarEstabelecimentoUseCase {
  constructor(private readonly estabelecimentos: EstabelecimentoRepository) {}

  async executar(idEstabelecimento: string): Promise<EstabelecimentoDTO> {
    const estabelecimento = await this.estabelecimentos.buscarPorId(idEstabelecimento);
    if (!estabelecimento) {
      throw new EstabelecimentoNaoEncontradoError(idEstabelecimento);
    }
    return paraEstabelecimentoDTO(estabelecimento);
  }
}
