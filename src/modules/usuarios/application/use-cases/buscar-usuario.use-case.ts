import { UsuarioNaoEncontradoError } from '../../domain/exceptions/usuario-nao-encontrado.error.js';
import type { UsuarioRepository } from '../../domain/repositories/usuario.repository.js';
import { paraUsuarioDTO, type UsuarioDTO } from '../dtos/usuario.dto.js';

export class BuscarUsuarioUseCase {
  constructor(private readonly usuarios: UsuarioRepository) {}

  async executar(id: string): Promise<UsuarioDTO> {
    const usuario = await this.usuarios.buscarPorId(id);
    if (!usuario) {
      throw new UsuarioNaoEncontradoError(id);
    }
    return paraUsuarioDTO(usuario);
  }
}
