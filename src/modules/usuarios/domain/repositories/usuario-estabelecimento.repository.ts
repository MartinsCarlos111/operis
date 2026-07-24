import type { UsuarioEstabelecimento } from '../entities/usuario-estabelecimento.js';

/**
 * Porta do agregado UsuarioEstabelecimento (vínculo). Identidade composta:
 * usuarioId + estabelecimentoId.
 */
export interface UsuarioEstabelecimentoRepository {
  buscar(usuarioId: string, estabelecimentoId: string): Promise<UsuarioEstabelecimento | null>;
  listarPorUsuario(usuarioId: string): Promise<UsuarioEstabelecimento[]>;
  salvar(vinculo: UsuarioEstabelecimento): Promise<void>;
}
