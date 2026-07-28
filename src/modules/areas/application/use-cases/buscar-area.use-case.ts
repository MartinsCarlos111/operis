import type { AreaRepository } from '../../domain/repositories/area.repository.js';
import { AreaNaoEncontradaError } from '../../domain/exceptions/area-nao-encontrada.error.js';
import { paraAreaDTO, type AreaDTO } from '../dtos/area.dto.js';

export interface BuscarAreaInput {
  idArea: string;
  estabelecimentoId: string;
}

/**
 * Busca uma Área por id (escopada ao estabelecimento ativo). Paridade com
 * AreaController.GetArea, que retorna 404 quando não encontra.
 */
export class BuscarAreaUseCase {
  constructor(private readonly areas: AreaRepository) {}

  async executar(input: BuscarAreaInput): Promise<AreaDTO> {
    const area = await this.areas.buscarPorId(input.idArea, input.estabelecimentoId);
    if (!area) {
      throw new AreaNaoEncontradaError(input.idArea);
    }
    return paraAreaDTO(area);
  }
}
