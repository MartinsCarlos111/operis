import type { CondicaoNotificacao } from '../entities/condicao-notificacao.js';

/** Port do agregado CondicaoNotificacao (sempre atrelada a uma regra). */
export interface CondicaoNotificacaoRepository {
  buscarPorId(idCondicaoNotificacao: string): Promise<CondicaoNotificacao | null>;
  /** Lista as condições de uma regra (paridade com ListarCondicoesNotificacao). */
  listarPorRegra(regraNotificacaoId: string): Promise<CondicaoNotificacao[]>;
  contarPorRegra(regraNotificacaoId: string): Promise<number>;
  salvar(condicao: CondicaoNotificacao): Promise<void>;
  excluir(idCondicaoNotificacao: string): Promise<void>;
}
