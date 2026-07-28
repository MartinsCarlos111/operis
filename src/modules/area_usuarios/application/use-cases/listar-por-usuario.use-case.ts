import type { AreaUsuarioRepository } from '../../domain/repositories/area-usuario.repository.js';
import { paraAreaUsuarioDTO, type AreaUsuarioDTO } from '../dtos/area-usuario.dto.js';
import type { ListaAreaUsuariosDTO } from './listar-por-area.use-case.js';

export interface ListarPorUsuarioInput {
  usuarioId: string;
}

/** Áreas vinculadas a um usuário → `{ model }`. */
export class ListarPorUsuarioUseCase {
  constructor(private readonly vinculos: AreaUsuarioRepository) {}

  async executar(input: ListarPorUsuarioInput): Promise<ListaAreaUsuariosDTO> {
    const vinculos = await this.vinculos.listarPorUsuario(input.usuarioId);
    return { model: vinculos.map(paraAreaUsuarioDTO) };
  }
}
