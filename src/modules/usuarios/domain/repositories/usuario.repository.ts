import type { Usuario } from '../entities/usuario.js';
import type { Email } from '../value-objects/email.js';

/**
 * Porta. A camada de aplicação depende desta interface; a infraestrutura
 * fornece o adaptador Prisma. O domínio é dono do contrato.
 */
export interface UsuarioRepository {
  buscarPorId(id: string): Promise<Usuario | null>;
  buscarPorEmail(email: Email): Promise<Usuario | null>;
  salvar(usuario: Usuario): Promise<void>;
}
