import type { NivelAcessoRepository } from '../../domain/repositories/nivel-acesso.repository.js';
import { paraNivelAcessoDTO, type NivelAcessoDTO } from '../dtos/nivel-acesso.dto.js';

export class ListarNiveisAcessoUseCase {
  constructor(private readonly niveis: NivelAcessoRepository) {}

  async executar(estabelecimentoId: string): Promise<NivelAcessoDTO[]> {
    const niveis = await this.niveis.listarPorEstabelecimento(estabelecimentoId);
    return niveis.map(paraNivelAcessoDTO);
  }
}
