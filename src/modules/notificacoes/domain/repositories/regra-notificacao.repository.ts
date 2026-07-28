import type { RegraNotificacao } from '../entities/regra-notificacao.js';

/** Critério de listagem paginada (paridade com RegraNotificacaoDAO). */
export interface CriterioListagemRegra {
  startIndex: number;
  maxRows: number;
  /** Busca textual opcional (código/descrição/tabela). */
  termo?: string | undefined;
}

/** Port do agregado RegraNotificacao. */
export interface RegraNotificacaoRepository {
  buscarPorId(idRegraNotificacao: string): Promise<RegraNotificacao | null>;
  /** Resolve unicidade de código no tenant (regra do RegraNotificacaoRN). */
  buscarPorCodigo(codigo: string): Promise<RegraNotificacao | null>;
  listar(criterio: CriterioListagemRegra): Promise<RegraNotificacao[]>;
  contar(termo?: string | undefined): Promise<number>;
  salvar(regra: RegraNotificacao): Promise<void>;
  excluir(idRegraNotificacao: string): Promise<void>;
}
