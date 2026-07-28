import type { AreaUsuarioRepository } from '../../domain/repositories/area-usuario.repository.js';
import { paraAreaUsuarioDTO, type AreaUsuarioDTO } from '../dtos/area-usuario.dto.js';

export interface ListarPorAreaInput {
  areaId: string;
}

/** Usuários vinculados a uma área → `{ model }` (paridade com o legado). */
export interface ListaAreaUsuariosDTO {
  model: AreaUsuarioDTO[];
}

export class ListarPorAreaUseCase {
  constructor(private readonly vinculos: AreaUsuarioRepository) {}

  async executar(input: ListarPorAreaInput): Promise<ListaAreaUsuariosDTO> {
    const vinculos = await this.vinculos.listarPorArea(input.areaId);
    return { model: vinculos.map(paraAreaUsuarioDTO) };
  }
}
