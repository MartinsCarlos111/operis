import type { Impressora as ImpressoraRow } from '@prisma/client';
import { Impressora } from '../../domain/entities/impressora.js';

/**
 * Traduz entre a linha do Prisma e a entidade de domínio. `restaurar` (não
 * `criar`) — a linha já existia, não se reexecutam regras de criação.
 */
export const ImpressoraMapper = {
  paraDominio(row: ImpressoraRow): Impressora {
    return Impressora.restaurar({
      idImpressora: row.idImpressora,
      codigo: row.codigo,
      descricao: row.descricao,
      endereco: row.endereco,
      criadoEm: row.criadoEm,
      atualizadoEm: row.atualizadoEm,
    });
  },

  paraPersistencia(impressora: Impressora): ImpressoraRow {
    return {
      idImpressora: impressora.idImpressora,
      codigo: impressora.codigo,
      descricao: impressora.descricao,
      endereco: impressora.endereco,
      criadoEm: impressora.criadoEm,
      atualizadoEm: impressora.atualizadoEm,
    };
  },
};
