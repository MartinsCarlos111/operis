import type { LayoutEtiqueta as LayoutRow } from '@prisma/client';
import { LayoutEtiqueta } from '../../domain/entities/layout-etiqueta.js';

export const LayoutEtiquetaMapper = {
  paraDominio(row: LayoutRow): LayoutEtiqueta {
    return LayoutEtiqueta.restaurar({
      idLayout: row.idLayout,
      codigo: row.codigo,
      descricao: row.descricao,
      zpl: row.zpl,
      criadoEm: row.criadoEm,
      atualizadoEm: row.atualizadoEm,
    });
  },

  paraPersistencia(l: LayoutEtiqueta): LayoutRow {
    return {
      idLayout: l.idLayout,
      codigo: l.codigo,
      descricao: l.descricao,
      zpl: l.zpl,
      criadoEm: l.criadoEm,
      atualizadoEm: l.atualizadoEm,
    };
  },
};
