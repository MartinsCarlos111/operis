import { Estabelecimento } from '../../domain/entities/estabelecimento.js';
import type { EstabelecimentoRepository } from '../../domain/repositories/estabelecimento.repository.js';
import type { GeradorId } from '@shared/domain/gerador-id.js';
import type { StatusRecurso } from '@shared/domain/status-recurso.js';
import { paraEstabelecimentoDTO, type EstabelecimentoDTO } from '../dtos/estabelecimento.dto.js';

export interface CriarEstabelecimentoInput {
  descricao: string;
  recursos?:
    | {
        impressoras?: StatusRecurso | undefined;
        coletores?: StatusRecurso | undefined;
        checklist?: StatusRecurso | undefined;
        manufatura?: StatusRecurso | undefined;
      }
    | undefined;
}

export class CriarEstabelecimentoUseCase {
  constructor(
    private readonly estabelecimentos: EstabelecimentoRepository,
    private readonly ids: GeradorId,
  ) {}

  async executar(input: CriarEstabelecimentoInput): Promise<EstabelecimentoDTO> {
    const estabelecimento = Estabelecimento.criar({
      idEstabelecimento: this.ids.gerar(),
      descricao: input.descricao,
      recursos: input.recursos,
    });

    await this.estabelecimentos.salvar(estabelecimento);
    return paraEstabelecimentoDTO(estabelecimento);
  }
}
