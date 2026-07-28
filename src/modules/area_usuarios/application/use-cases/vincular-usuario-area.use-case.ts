import { AreaUsuario } from '../../domain/entities/area-usuario.js';
import type { AreaUsuarioRepository } from '../../domain/repositories/area-usuario.repository.js';
import type { VerificadorArea, VerificadorUsuario } from '../../domain/gateways/verificadores.js';
import { VinculoAreaUsuarioJaExisteError } from '../../domain/exceptions/vinculo-ja-existe.error.js';
import {
  AreaInexistenteError,
  UsuarioInexistenteError,
} from '../../domain/exceptions/referencia-invalida.error.js';
import { paraAreaUsuarioDTO, type AreaUsuarioDTO } from '../dtos/area-usuario.dto.js';

export interface VincularUsuarioAreaInput {
  areaId: string;
  usuarioId: string;
}

/**
 * Vincula um usuário a uma área. Preserva AreaUsuarioRN.Adicionar + Validar:
 *   1. área existe
 *   2. usuário existe
 *   3. o par ainda não está vinculado
 */
export class VincularUsuarioAreaUseCase {
  constructor(
    private readonly vinculos: AreaUsuarioRepository,
    private readonly areas: VerificadorArea,
    private readonly usuarios: VerificadorUsuario,
  ) {}

  async executar(input: VincularUsuarioAreaInput): Promise<AreaUsuarioDTO> {
    if (!(await this.areas.existe(input.areaId))) {
      throw new AreaInexistenteError(input.areaId);
    }
    if (!(await this.usuarios.existe(input.usuarioId))) {
      throw new UsuarioInexistenteError(input.usuarioId);
    }

    const existente = await this.vinculos.buscar(input.areaId, input.usuarioId);
    if (existente) {
      throw new VinculoAreaUsuarioJaExisteError();
    }

    const vinculo = AreaUsuario.criar({ areaId: input.areaId, usuarioId: input.usuarioId });
    await this.vinculos.salvar(vinculo);
    return paraAreaUsuarioDTO(vinculo);
  }
}
