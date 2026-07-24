import type { Estabelecimento as EstabelecimentoRow } from '@prisma/client';
import { Estabelecimento } from '../../domain/entities/estabelecimento.js';

/**
 * Traduz entre a linha do Prisma e a entidade de domínio. `restaurar` (não
 * `criar`) — a linha já existia, não se reexecutam regras de criação.
 */
export const EstabelecimentoMapper = {
  paraDominio(row: EstabelecimentoRow): Estabelecimento {
    return Estabelecimento.restaurar({
      idEstabelecimento: row.idEstabelecimento,
      descricao: row.descricao,
      status: row.status,
      recursos: {
        impressoras: row.impressoras,
        coletores: row.coletores,
        checklist: row.checklist,
        manufatura: row.manufatura,
      },
      criadoEm: row.criadoEm,
      atualizadoEm: row.atualizadoEm,
    });
  },

  paraPersistencia(estabelecimento: Estabelecimento): EstabelecimentoRow {
    const recursos = estabelecimento.recursos;
    return {
      idEstabelecimento: estabelecimento.idEstabelecimento,
      descricao: estabelecimento.descricao,
      status: estabelecimento.status,
      impressoras: recursos.impressoras,
      coletores: recursos.coletores,
      checklist: recursos.checklist,
      manufatura: recursos.manufatura,
      criadoEm: estabelecimento.criadoEm,
      atualizadoEm: estabelecimento.atualizadoEm,
    };
  },
};
