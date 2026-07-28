import type { AreaUsuarioRepository } from '../../domain/repositories/area-usuario.repository.js';
import { VinculoAreaUsuarioNaoEncontradoError } from '../../domain/exceptions/vinculo-nao-encontrado.error.js';

export interface DesvincularUsuarioAreaInput {
  areaId: string;
  usuarioId: string;
}

/**
 * Remove o vínculo área ↔ usuário (paridade com DeleteAreaUsuario, por par).
 * 404 se o vínculo não existe.
 */
export class DesvincularUsuarioAreaUseCase {
  constructor(private readonly vinculos: AreaUsuarioRepository) {}

  async executar(input: DesvincularUsuarioAreaInput): Promise<void> {
    const vinculo = await this.vinculos.buscar(input.areaId, input.usuarioId);
    if (!vinculo) {
      throw new VinculoAreaUsuarioNaoEncontradoError(input.areaId, input.usuarioId);
    }
    await this.vinculos.excluir(input.areaId, input.usuarioId);
  }
}
