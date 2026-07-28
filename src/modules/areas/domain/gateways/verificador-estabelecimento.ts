/**
 * Porta anticorrupção para o contexto de estabelecimentos. A regra do AreaRN
 * (ValidarArea) exige que o estabelecimento exista e esteja ATIVO antes de
 * criar/editar uma área — este contexto responde a isso sem importar os
 * internals do módulo estabelecimentos (fronteira entre features).
 */
export interface VerificadorEstabelecimento {
  /** true se o estabelecimento existe; false se não existe. */
  existe(estabelecimentoId: string): Promise<boolean>;
  /** true se o estabelecimento existe E está ativo. */
  estaAtivo(estabelecimentoId: string): Promise<boolean>;
}
