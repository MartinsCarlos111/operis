import type { AreaUsuario } from '../entities/area-usuario.js';

/** Port do vínculo área ↔ usuário. */
export interface AreaUsuarioRepository {
  buscar(areaId: string, usuarioId: string): Promise<AreaUsuario | null>;
  listarPorArea(areaId: string): Promise<AreaUsuario[]>;
  listarPorUsuario(usuarioId: string): Promise<AreaUsuario[]>;
  salvar(vinculo: AreaUsuario): Promise<void>;
  excluir(areaId: string, usuarioId: string): Promise<void>;
}
