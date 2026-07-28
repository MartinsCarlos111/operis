import type { AreaRepository } from '../../domain/repositories/area.repository.js';
import type { VerificadorEstabelecimento } from '../../domain/gateways/verificador-estabelecimento.js';
import { AreaNaoEncontradaError } from '../../domain/exceptions/area-nao-encontrada.error.js';
import { CodigoAreaJaExisteError } from '../../domain/exceptions/codigo-area-ja-existe.error.js';
import { EstabelecimentoInativoError } from '../../domain/exceptions/estabelecimento-inativo.error.js';
import { paraAreaDTO, type AreaDTO } from '../dtos/area.dto.js';

export interface EditarAreaInput {
  idArea: string;
  estabelecimentoId: string;
  codigo: string;
  descricao: string;
}

/**
 * Edita uma Área. Preserva AreaRN.EditarArea + ValidarArea:
 *   1. código/descrição obrigatórios  (Area.alterar)
 *   2. área existe no estabelecimento ativo
 *   3. estabelecimento ativo
 *   4. se o código mudou, o novo não pode colidir com outra área
 */
export class EditarAreaUseCase {
  constructor(
    private readonly areas: AreaRepository,
    private readonly estabelecimentos: VerificadorEstabelecimento,
  ) {}

  async executar(input: EditarAreaInput): Promise<AreaDTO> {
    const area = await this.areas.buscarPorId(input.idArea, input.estabelecimentoId);
    if (!area) {
      throw new AreaNaoEncontradaError(input.idArea);
    }

    if (!(await this.estabelecimentos.estaAtivo(input.estabelecimentoId))) {
      throw new EstabelecimentoInativoError(input.estabelecimentoId);
    }

    // Colisão só importa se o código realmente mudou.
    const novoCodigo = input.codigo.trim();
    if (novoCodigo !== area.codigo) {
      const colisao = await this.areas.buscarPorCodigo(novoCodigo, input.estabelecimentoId);
      if (colisao) {
        throw new CodigoAreaJaExisteError(novoCodigo);
      }
    }

    area.alterar({ codigo: input.codigo, descricao: input.descricao });
    await this.areas.salvar(area);
    return paraAreaDTO(area);
  }
}
