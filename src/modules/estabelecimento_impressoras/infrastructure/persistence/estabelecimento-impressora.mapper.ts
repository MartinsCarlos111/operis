import type { EstabelecimentoImpressora as VinculoRow } from '@prisma/client';
import { EstabelecimentoImpressora } from '../../domain/entities/estabelecimento-impressora.js';

export const EstabelecimentoImpressoraMapper = {
  paraDominio(row: VinculoRow): EstabelecimentoImpressora {
    return EstabelecimentoImpressora.restaurar({
      estabelecimentoId: row.estabelecimentoId,
      impressoraId: row.impressoraId,
      criadoEm: row.criadoEm,
    });
  },

  paraPersistencia(vinculo: EstabelecimentoImpressora): VinculoRow {
    return {
      estabelecimentoId: vinculo.estabelecimentoId,
      impressoraId: vinculo.impressoraId,
      criadoEm: vinculo.criadoEm,
    };
  },
};
