import { CondicaoNotificacao } from '../../domain/entities/condicao-notificacao.js';
import type { CondicaoNotificacaoRepository } from '../../domain/repositories/condicao-notificacao.repository.js';
import type { RegraNotificacaoRepository } from '../../domain/repositories/regra-notificacao.repository.js';
import type { GeradorId } from '@shared/domain/gerador-id.js';
import { RegraNotificacaoNaoEncontradaError } from '../../domain/exceptions/regra-notificacao-nao-encontrada.error.js';
import {
  paraCondicaoNotificacaoDTO,
  type CondicaoNotificacaoDTO,
} from '../dtos/condicao-notificacao.dto.js';

export interface CriarCondicaoNotificacaoInput {
  idRegraNotificacao: string;
  campo: string;
  operador: string;
  valor?: string | undefined;
}

/**
 * Cria uma Condição atrelada a uma Regra. A regra pai deve existir (evita
 * condição órfã — a FK garantiria, mas retornamos 404 explícito e amigável).
 */
export class CriarCondicaoNotificacaoUseCase {
  constructor(
    private readonly condicoes: CondicaoNotificacaoRepository,
    private readonly regras: RegraNotificacaoRepository,
    private readonly ids: GeradorId,
  ) {}

  async executar(input: CriarCondicaoNotificacaoInput): Promise<CondicaoNotificacaoDTO> {
    const regra = await this.regras.buscarPorId(input.idRegraNotificacao);
    if (!regra) {
      throw new RegraNotificacaoNaoEncontradaError(input.idRegraNotificacao);
    }

    const condicao = CondicaoNotificacao.criar({
      idCondicaoNotificacao: this.ids.gerar(),
      regraNotificacaoId: input.idRegraNotificacao,
      campo: input.campo,
      operador: input.operador,
      valor: input.valor,
    });

    await this.condicoes.salvar(condicao);
    return paraCondicaoNotificacaoDTO(condicao);
  }
}
