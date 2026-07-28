import { Cracha } from '../../domain/entities/cracha.js';
import type { CrachaRepository } from '../../domain/repositories/cracha.repository.js';
import type { GeradorId } from '@shared/domain/gerador-id.js';
import type { StatusRecurso } from '@shared/domain/status-recurso.js';
import { CodigoCrachaJaExisteError } from '../../domain/exceptions/codigo-cracha-ja-existe.error.js';
import { paraCrachaDTO, type CrachaDTO } from '../dtos/cracha.dto.js';

export interface CriarCrachaInput {
  codigo: string;
  nome: string;
  status?: StatusRecurso | undefined;
}

/**
 * Cria um Crachá. Preserva CrachaRN.AdicionarCracha + Cracha.Validar:
 *   1. código/nome obrigatórios  (entidade)
 *   2. código único no tenant
 */
export class CriarCrachaUseCase {
  constructor(
    private readonly crachas: CrachaRepository,
    private readonly ids: GeradorId,
  ) {}

  async executar(input: CriarCrachaInput): Promise<CrachaDTO> {
    const cracha = Cracha.criar({
      idCracha: this.ids.gerar(),
      codigo: input.codigo,
      nome: input.nome,
      status: input.status,
    });

    const existente = await this.crachas.buscarPorCodigo(cracha.codigo);
    if (existente) {
      throw new CodigoCrachaJaExisteError(cracha.codigo);
    }

    await this.crachas.salvar(cracha);
    return paraCrachaDTO(cracha);
  }
}
