import type { Usuario } from '../../domain/entities/usuario.js';
import type { StatusRecurso } from '@shared/domain/status-recurso.js';
import type { PoliticasLoginProps } from '../../domain/value-objects/politicas-login.js';

export interface UsuarioDTO {
  idUsuario: string;
  nome: string;
  email: string;
  biometria: boolean;
  status: StatusRecurso;
  politicasLogin: PoliticasLoginProps;
  criadoEm: string;
  atualizadoEm: string;
}

export function paraUsuarioDTO(usuario: Usuario): UsuarioDTO {
  return {
    idUsuario: usuario.idUsuario,
    nome: usuario.nome,
    email: usuario.email.valor,
    biometria: usuario.biometria,
    status: usuario.status,
    politicasLogin: usuario.politicasLogin.toJSON(),
    criadoEm: usuario.criadoEm.toISOString(),
    atualizadoEm: usuario.atualizadoEm.toISOString(),
  };
}
