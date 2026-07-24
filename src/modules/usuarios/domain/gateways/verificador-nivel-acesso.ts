/**
 * Porta anticorrupção para o contexto de estabelecimentos: valida se um nível
 * de acesso existe, está ativo e pertence ao estabelecimento informado, sem que
 * este contexto importe os internals do outro (fronteira entre features).
 */
export interface VerificadorNivelAcesso {
  pertenceAoEstabelecimento(nivelAcessoId: string, estabelecimentoId: string): Promise<boolean>;
}
