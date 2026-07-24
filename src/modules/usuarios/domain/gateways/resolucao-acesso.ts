/**
 * Resultado da resolução de acesso de um usuário num estabelecimento:
 * o nível e as chaves de permissão já achatadas, prontas para comparação
 * exata nas rotas.
 */
export interface AcessoResolvido {
  nivelAcessoId: string;
  nivelNome: string;
  /** Chaves no padrão grupo:acao (ex.: "manufatura:create"). */
  permissoes: string[];
}

/**
 * Porta de leitura (read model) usada no fluxo de autorização em runtime.
 * Decisão de segurança do projeto: o JWT carrega só a identidade; as
 * permissões são resolvidas AQUI, a cada request, a partir de
 * (usuarioId + estabelecimentoId do header). Isso garante revogação imediata
 * e impede vazamento de permissões entre tenants.
 *
 * Retorna null se não houver vínculo ATIVO (usuário sem acesso ao tenant).
 */
export interface ResolucaoAcesso {
  resolver(usuarioId: string, estabelecimentoId: string): Promise<AcessoResolvido | null>;
}
