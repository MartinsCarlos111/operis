/**
 * Porta anticorrupção para o contexto de estabelecimentos. O
 * CentroTrabalhoRN.ValidarCentroTrabalho exige três coisas do estabelecimento
 * do calendário: que exista, que esteja ativo e que tenha o produto Manufatura
 * habilitado. Este contexto responde a isso sem importar os internals do módulo
 * estabelecimentos (fronteira entre features).
 */
export interface VerificadorEstabelecimento {
  estaAtivo(estabelecimentoId: string): Promise<boolean>;
  /** ex-Estabelecimento.ProdutoManufatura → campo `manufatura` (StatusRecurso). */
  temManufatura(estabelecimentoId: string): Promise<boolean>;
}
