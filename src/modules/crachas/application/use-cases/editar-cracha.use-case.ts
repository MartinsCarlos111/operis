import type { CrachaRepository } from '../../domain/repositories/cracha.repository.js';
import type { StatusRecurso } from '@shared/domain/status-recurso.js';
import { CrachaNaoEncontradoError } from '../../domain/exceptions/cracha-nao-encontrado.error.js';
import { CodigoCrachaJaExisteError } from '../../domain/exceptions/codigo-cracha-ja-existe.error.js';
import { paraCrachaDTO, type CrachaDTO } from '../dtos/cracha.dto.js';

export interface EditarCrachaInput {
  idCracha: string;
  codigo: string;
  nome: string;
  status?: StatusRecurso | undefined;
}

/**
 * Edita um Crachá. Preserva CrachaRN.EditarCracha + Validar:
 *   1. código/nome obrigatórios  (entidade)
 *   2. crachá existe
 *   3. se o código mudou, o novo não pode colidir
 */
export class EditarCrachaUseCase {
  constructor(private readonly crachas: CrachaRepository) {}

  async executar(input: EditarCrachaInput): Promise<CrachaDTO> {
    const cracha = await this.crachas.buscarPorId(input.idCracha);
    if (!cracha) {
      throw new CrachaNaoEncontradoError(input.idCracha);
    }

    const novoCodigo = input.codigo.trim();
    if (novoCodigo !== cracha.codigo) {
      const colisao = await this.crachas.buscarPorCodigo(novoCodigo);
      if (colisao) {
        throw new CodigoCrachaJaExisteError(novoCodigo);
      }
    }

    cracha.alterar({ codigo: input.codigo, nome: input.nome, status: input.status });
    await this.crachas.salvar(cracha);
    return paraCrachaDTO(cracha);
  }
}
