/**
 * Portas anticorrupção para os contextos de estabelecimentos e impressoras.
 * O EstabelecimentoImpressoraRN exige que ambos existam antes de vincular; este
 * módulo confere isso sem importar os internals dos outros (fronteira entre
 * features).
 */
export interface VerificadorEstabelecimento {
  existe(estabelecimentoId: string): Promise<boolean>;
}

export interface VerificadorImpressora {
  existe(impressoraId: string): Promise<boolean>;
}
