import type { AreaUsuario as VinculoRow } from '@prisma/client';
import { AreaUsuario } from '../../domain/entities/area-usuario.js';

export const AreaUsuarioMapper = {
  paraDominio(row: VinculoRow): AreaUsuario {
    return AreaUsuario.restaurar({
      areaId: row.areaId,
      usuarioId: row.usuarioId,
      criadoEm: row.criadoEm,
    });
  },

  paraPersistencia(vinculo: AreaUsuario): VinculoRow {
    return {
      areaId: vinculo.areaId,
      usuarioId: vinculo.usuarioId,
      criadoEm: vinculo.criadoEm,
    };
  },
};
