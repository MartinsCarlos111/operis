import type { Permissao } from '../entities/permissao.js';

/**
 * Porta do catálogo de permissões. O catálogo é a fonte para o front listar o
 * que pode ser selecionado num nível de acesso.
 */
export interface PermissaoRepository {
  listarTodas(): Promise<Permissao[]>;
  buscarPorIds(ids: string[]): Promise<Permissao[]>;
  salvar(permissao: Permissao): Promise<void>;
}
