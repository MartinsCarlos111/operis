import type { Usuario as UsuarioRow, Prisma } from '@prisma/client';
import { Usuario } from '../../domain/entities/usuario.js';
import { Email } from '../../domain/value-objects/email.js';
import { PoliticasLogin, type PoliticasLoginProps } from '../../domain/value-objects/politicas-login.js';

export const UsuarioMapper = {
  paraDominio(row: UsuarioRow): Usuario {
    return Usuario.restaurar({
      idUsuario: row.idUsuario,
      nome: row.nome,
      email: Email.criar(row.email),
      biometria: row.biometria,
      status: row.status,
      politicasLogin: PoliticasLogin.criar(
        (row.politicasLogin as PoliticasLoginProps | null) ?? {},
      ),
      criadoEm: row.criadoEm,
      atualizadoEm: row.atualizadoEm,
    });
  },

  paraPersistencia(usuario: Usuario): Omit<UsuarioRow, 'politicasLogin'> & {
    politicasLogin: Prisma.InputJsonValue;
  } {
    return {
      idUsuario: usuario.idUsuario,
      nome: usuario.nome,
      email: usuario.email.valor,
      biometria: usuario.biometria,
      status: usuario.status,
      politicasLogin: usuario.politicasLogin.toJSON() as Prisma.InputJsonValue,
      criadoEm: usuario.criadoEm,
      atualizadoEm: usuario.atualizadoEm,
    };
  },
};
