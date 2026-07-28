import type { EstabelecimentoImpressora } from '../../domain/entities/estabelecimento-impressora.js';

/** Saída de um vínculo estabelecimento ↔ impressora. */
export interface EstabelecimentoImpressoraDTO {
  idEstabelecimento: string;
  idImpressora: string;
  criadoEm: string;
}

export function paraEstabelecimentoImpressoraDTO(
  vinculo: EstabelecimentoImpressora,
): EstabelecimentoImpressoraDTO {
  return {
    idEstabelecimento: vinculo.estabelecimentoId,
    idImpressora: vinculo.impressoraId,
    criadoEm: vinculo.criadoEm.toISOString(),
  };
}
