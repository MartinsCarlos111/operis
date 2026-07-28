import type { PrismaClient } from '@prisma/client';
import type { VerificadorArea, VerificadorUsuario } from '../../domain/gateways/verificadores.js';

/** Adaptadores anticorrupção: consultam as tabelas diretamente, sem importar
 * internals dos módulos de áreas/usuários. */

export class PrismaVerificadorArea implements VerificadorArea {
  constructor(private readonly prisma: PrismaClient) {}

  async existe(areaId: string): Promise<boolean> {
    const row = await this.prisma.area.findUnique({
      where: { idArea: areaId },
      select: { idArea: true },
    });
    return row !== null;
  }
}

export class PrismaVerificadorUsuario implements VerificadorUsuario {
  constructor(private readonly prisma: PrismaClient) {}

  async existe(usuarioId: string): Promise<boolean> {
    const row = await this.prisma.usuario.findUnique({
      where: { idUsuario: usuarioId },
      select: { idUsuario: true },
    });
    return row !== null;
  }
}
