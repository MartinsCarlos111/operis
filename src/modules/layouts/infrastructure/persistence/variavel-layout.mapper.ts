import type { VariavelLayout as VariavelRow } from '@prisma/client';
import { VariavelLayout } from '../../domain/entities/variavel-layout.js';

export const VariavelLayoutMapper = {
  paraDominio(row: VariavelRow): VariavelLayout {
    return VariavelLayout.restaurar({
      idVariavel: row.idVariavel,
      codigo: row.codigo,
      descricao: row.descricao,
      campoEtiquetaManufatura: row.campoEtiquetaManufatura,
      campoEtiquetaColetores: row.campoEtiquetaColetores,
      criadoEm: row.criadoEm,
      atualizadoEm: row.atualizadoEm,
    });
  },

  paraPersistencia(v: VariavelLayout): VariavelRow {
    return {
      idVariavel: v.idVariavel,
      codigo: v.codigo,
      descricao: v.descricao,
      campoEtiquetaManufatura: v.campoEtiquetaManufatura,
      campoEtiquetaColetores: v.campoEtiquetaColetores,
      criadoEm: v.criadoEm,
      atualizadoEm: v.atualizadoEm,
    };
  },
};
