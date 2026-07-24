import type { PermissaoRepository } from '../../domain/repositories/permissao.repository.js';
import { paraPermissaoDTO, type PermissaoDTO } from '../dtos/permissao.dto.js';

/** Lista o catálogo de permissões — fonte para o front montar a seleção de um nível. */
export class ListarPermissoesUseCase {
  constructor(private readonly permissoes: PermissaoRepository) {}

  async executar(): Promise<PermissaoDTO[]> {
    const todas = await this.permissoes.listarTodas();
    return todas.map(paraPermissaoDTO);
  }
}
