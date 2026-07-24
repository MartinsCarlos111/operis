import type { NivelAcesso } from '../entities/nivel-acesso.js';

/**
 * Porta do agregado NivelAcesso. A persistência da junção N:N com Permissao é
 * detalhe do adaptador — o domínio só conhece o Set de permissaoIds.
 */
export interface NivelAcessoRepository {
  buscarPorId(id: string): Promise<NivelAcesso | null>;
  buscarPorNome(estabelecimentoId: string, nome: string): Promise<NivelAcesso | null>;
  listarPorEstabelecimento(estabelecimentoId: string): Promise<NivelAcesso[]>;
  salvar(nivel: NivelAcesso): Promise<void>;
}
