import type { Area as AreaRow } from '@prisma/client';
import { Area } from '../../domain/entities/area.js';

/**
 * Traduz entre a linha do Prisma e a entidade de domínio. `restaurar` (não
 * `criar`) — a linha já existia, não se reexecutam regras de criação.
 */
export const AreaMapper = {
  paraDominio(row: AreaRow): Area {
    return Area.restaurar({
      idArea: row.idArea,
      codigo: row.codigo,
      descricao: row.descricao,
      estabelecimentoId: row.estabelecimentoId,
      criadoEm: row.criadoEm,
      atualizadoEm: row.atualizadoEm,
    });
  },

  paraPersistencia(area: Area): AreaRow {
    return {
      idArea: area.idArea,
      codigo: area.codigo,
      descricao: area.descricao,
      estabelecimentoId: area.estabelecimentoId,
      criadoEm: area.criadoEm,
      atualizadoEm: area.atualizadoEm,
    };
  },
};
