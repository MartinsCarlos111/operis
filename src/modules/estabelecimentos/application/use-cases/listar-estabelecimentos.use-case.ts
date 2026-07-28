import type { EstabelecimentoRepository } from '../../domain/repositories/estabelecimento.repository.js';
import { paraEstabelecimentoDTO, type EstabelecimentoDTO } from '../dtos/estabelecimento.dto.js';

/**
 * Lista os estabelecimentos do tenant (banco dedicado resolvido por request).
 * Usado pela tela de seleção do front: o tenant-admin escolhe o estabelecimento
 * ativo antes de operar. Sem filtro por vínculo — o admin administra o tenant
 * inteiro.
 */
export class ListarEstabelecimentosUseCase {
  constructor(private readonly estabelecimentos: EstabelecimentoRepository) {}

  async executar(): Promise<EstabelecimentoDTO[]> {
    const estabelecimentos = await this.estabelecimentos.listar();
    return estabelecimentos.map(paraEstabelecimentoDTO);
  }
}
