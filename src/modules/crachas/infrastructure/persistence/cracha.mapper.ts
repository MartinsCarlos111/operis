import type { Cracha as CrachaRow } from '@prisma/client';
import { Cracha } from '../../domain/entities/cracha.js';

export const CrachaMapper = {
  paraDominio(row: CrachaRow): Cracha {
    return Cracha.restaurar({
      idCracha: row.idCracha,
      codigo: row.codigo,
      nome: row.nome,
      status: row.status,
      criadoEm: row.criadoEm,
      atualizadoEm: row.atualizadoEm,
    });
  },

  paraPersistencia(cracha: Cracha): CrachaRow {
    return {
      idCracha: cracha.idCracha,
      codigo: cracha.codigo,
      nome: cracha.nome,
      status: cracha.status,
      criadoEm: cracha.criadoEm,
      atualizadoEm: cracha.atualizadoEm,
    };
  },
};
