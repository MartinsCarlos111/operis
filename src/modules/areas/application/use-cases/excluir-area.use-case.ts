import type { AreaRepository } from '../../domain/repositories/area.repository.js';
import { AreaNaoEncontradaError } from '../../domain/exceptions/area-nao-encontrada.error.js';
import { AreaComUsuariosVinculadosError } from '../../domain/exceptions/area-com-usuarios-vinculados.error.js';

export interface ExcluirAreaInput {
  idArea: string;
  estabelecimentoId: string;
}

/**
 * Exclui uma Área. Preserva AreaRN.ExcluirArea:
 *   1. área existe (no estabelecimento ativo)
 *   2. não há usuários vinculados à área  → bloqueia
 *   3. exclui
 *
 * (A checagem de relações em Manufatura do legado entra quando aquele domínio
 * for migrado — TODO rastreado no plano de migração.)
 */
export class ExcluirAreaUseCase {
  constructor(private readonly areas: AreaRepository) {}

  async executar(input: ExcluirAreaInput): Promise<void> {
    const area = await this.areas.buscarPorId(input.idArea, input.estabelecimentoId);
    if (!area) {
      throw new AreaNaoEncontradaError(input.idArea);
    }

    const usuariosVinculados = await this.areas.contarUsuariosVinculados(input.idArea);
    if (usuariosVinculados > 0) {
      throw new AreaComUsuariosVinculadosError(area.codigo, usuariosVinculados);
    }

    await this.areas.excluir(input.idArea);
  }
}
