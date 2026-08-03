/**
 * Porta anticorrupção para o contexto de estabelecimentos: um coletor só pode
 * ser cadastrado em estabelecimento existente e ATIVO. Espelha o gateway
 * homônimo do módulo areas — cada feature declara a sua, sem importar os
 * internals da outra.
 */
export interface VerificadorEstabelecimento {
  existe(estabelecimentoId: string): Promise<boolean>;
  estaAtivo(estabelecimentoId: string): Promise<boolean>;
}
