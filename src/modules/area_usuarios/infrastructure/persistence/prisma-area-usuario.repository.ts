import type { PrismaClient } from '@prisma/client';
import type { AreaUsuario } from '../../domain/entities/area-usuario.js';
import type { AreaUsuarioRepository } from '../../domain/repositories/area-usuario.repository.js';
import { AreaUsuarioMapper } from './area-usuario.mapper.js';

export class PrismaAreaUsuarioRepository implements AreaUsuarioRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async buscar(areaId: string, usuarioId: string): Promise<AreaUsuario | null> {
    const row = await this.prisma.areaUsuario.findUnique({
      where: { areaId_usuarioId: { areaId, usuarioId } },
    });
    return row ? AreaUsuarioMapper.paraDominio(row) : null;
  }

  async listarPorArea(areaId: string): Promise<AreaUsuario[]> {
    const rows = await this.prisma.areaUsuario.findMany({
      where: { areaId },
      orderBy: { criadoEm: 'asc' },
    });
    return rows.map(AreaUsuarioMapper.paraDominio);
  }

  async listarPorUsuario(usuarioId: string): Promise<AreaUsuario[]> {
    const rows = await this.prisma.areaUsuario.findMany({
      where: { usuarioId },
      orderBy: { criadoEm: 'asc' },
    });
    return rows.map(AreaUsuarioMapper.paraDominio);
  }

  async salvar(vinculo: AreaUsuario): Promise<void> {
    const data = AreaUsuarioMapper.paraPersistencia(vinculo);
    await this.prisma.areaUsuario.upsert({
      where: { areaId_usuarioId: { areaId: data.areaId, usuarioId: data.usuarioId } },
      create: data,
      update: {},
    });
  }

  async excluir(areaId: string, usuarioId: string): Promise<void> {
    await this.prisma.areaUsuario.delete({
      where: { areaId_usuarioId: { areaId, usuarioId } },
    });
  }
}
