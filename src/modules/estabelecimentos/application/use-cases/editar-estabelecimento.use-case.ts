import type { EstabelecimentoRepository } from '../../domain/repositories/estabelecimento.repository.js';
import { EstabelecimentoNaoEncontradoError } from '../../domain/exceptions/estabelecimento-nao-encontrado.error.js';
import { StatusRecurso } from '@shared/domain/status-recurso.js';
import { paraEstabelecimentoDTO, type EstabelecimentoDTO } from '../dtos/estabelecimento.dto.js';

export interface EditarEstabelecimentoInput {
  idEstabelecimento: string;
  descricao: string;
  recursos?:
    | {
        impressoras?: StatusRecurso | undefined;
        coletores?: StatusRecurso | undefined;
        checklist?: StatusRecurso | undefined;
        manufatura?: StatusRecurso | undefined;
      }
    | undefined;
  /** Opcional: omitido preserva o status atual. É por aqui que se reativa. */
  status?: StatusRecurso | undefined;
}

/**
 * Edita um estabelecimento:
 *   1. existe?                          → 404
 *   2. descrição/recursos (entidade)    → invariante da descrição
 *   3. status, se informado             → ativar/inativar (ciclo de vida)
 *
 * O `status` passa pelos métodos de ciclo de vida em vez de virar atribuição
 * direta: é a transição que carrega a regra, não o campo.
 */
export class EditarEstabelecimentoUseCase {
  constructor(private readonly estabelecimentos: EstabelecimentoRepository) {}

  async executar(input: EditarEstabelecimentoInput): Promise<EstabelecimentoDTO> {
    const estabelecimento = await this.estabelecimentos.buscarPorId(input.idEstabelecimento);
    if (!estabelecimento) {
      throw new EstabelecimentoNaoEncontradoError(input.idEstabelecimento);
    }

    estabelecimento.alterar({ descricao: input.descricao, recursos: input.recursos });

    if (input.status === StatusRecurso.ATIVO && !estabelecimento.estaAtivo()) {
      estabelecimento.ativar();
    } else if (input.status === StatusRecurso.INATIVO && estabelecimento.estaAtivo()) {
      estabelecimento.inativar();
    }

    await this.estabelecimentos.salvar(estabelecimento);
    return paraEstabelecimentoDTO(estabelecimento);
  }
}
