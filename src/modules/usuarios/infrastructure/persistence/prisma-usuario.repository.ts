import type { PrismaClient } from '@prisma/client';
import type { Usuario } from '../../domain/entities/usuario.js';
import type { Email } from '../../domain/value-objects/email.js';
import type { UsuarioRepository } from '../../domain/repositories/usuario.repository.js';
import { UsuarioMapper } from './usuario.mapper.js';

export class PrismaUsuarioRepository implements UsuarioRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async buscarPorId(id: string): Promise<Usuario | null> {
    const row = await this.prisma.usuario.findUnique({ where: { idUsuario: id } });
    return row ? UsuarioMapper.paraDominio(row) : null;
  }

  async buscarPorEmail(email: Email): Promise<Usuario | null> {
    const row = await this.prisma.usuario.findUnique({ where: { email: email.valor } });
    return row ? UsuarioMapper.paraDominio(row) : null;
  }

  async salvar(usuario: Usuario): Promise<void> {
    const data = UsuarioMapper.paraPersistencia(usuario);
    await this.prisma.usuario.upsert({
      where: { idUsuario: data.idUsuario },
      create: data,
      update: {
        nome: data.nome,
        email: data.email,
        biometria: data.biometria,
        status: data.status,
        politicasLogin: data.politicasLogin,
        atualizadoEm: data.atualizadoEm,
      },
    });
  }
}
