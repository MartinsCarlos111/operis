import { Area } from '../../domain/entities/area.js';
import type { AreaRepository } from '../../domain/repositories/area.repository.js';
import type { VerificadorEstabelecimento } from '../../domain/gateways/verificador-estabelecimento.js';
import type { GeradorId } from '@shared/domain/gerador-id.js';
import { CodigoAreaJaExisteError } from '../../domain/exceptions/codigo-area-ja-existe.error.js';
import { EstabelecimentoNaoEncontradoError } from '../../domain/exceptions/estabelecimento-nao-encontrado.error.js';
import { EstabelecimentoInativoError } from '../../domain/exceptions/estabelecimento-inativo.error.js';
import { paraAreaDTO, type AreaDTO } from '../dtos/area.dto.js';

export interface CriarAreaInput {
  /** Estabelecimento ativo (resolvido do contexto, não do body). */
  estabelecimentoId: string;
  codigo: string;
  descricao: string;
}

/**
 * Cria uma Área. Preserva AreaRN.AdicionarArea + ValidarArea:
 *   1. código/descrição obrigatórios  (invariante da entidade Area.criar)
 *   2. estabelecimento existe e está ATIVO
 *   3. código único dentro do estabelecimento
 */
export class CriarAreaUseCase {
  constructor(
    private readonly areas: AreaRepository,
    private readonly estabelecimentos: VerificadorEstabelecimento,
    private readonly ids: GeradorId,
  ) {}

  async executar(input: CriarAreaInput): Promise<AreaDTO> {
    // Entidade valida forma (código/descrição não-vazios) antes de tocar o banco.
    const area = Area.criar({
      idArea: this.ids.gerar(),
      codigo: input.codigo,
      descricao: input.descricao,
      estabelecimentoId: input.estabelecimentoId,
    });

    if (!(await this.estabelecimentos.existe(input.estabelecimentoId))) {
      throw new EstabelecimentoNaoEncontradoError(input.estabelecimentoId);
    }
    if (!(await this.estabelecimentos.estaAtivo(input.estabelecimentoId))) {
      throw new EstabelecimentoInativoError(input.estabelecimentoId);
    }

    const existente = await this.areas.buscarPorCodigo(area.codigo, input.estabelecimentoId);
    if (existente) {
      throw new CodigoAreaJaExisteError(area.codigo);
    }

    await this.areas.salvar(area);
    return paraAreaDTO(area);
  }
}
