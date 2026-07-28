import type { Impressora } from '../../domain/entities/impressora.js';

/**
 * Saída de uma Impressora. Espelha o ImpressoraModel do Octopus
 * (idImpressora, cdImpressora, dsImpressora, endereco) com o vocabulário do
 * operis: `codigo`/`descricao`. Colunas Aux do legado descartadas.
 */
export interface ImpressoraDTO {
  idImpressora: string;
  codigo: string;
  descricao: string;
  endereco: string;
  criadoEm: string;
  atualizadoEm: string;
}

export function paraImpressoraDTO(impressora: Impressora): ImpressoraDTO {
  return {
    idImpressora: impressora.idImpressora,
    codigo: impressora.codigo,
    descricao: impressora.descricao,
    endereco: impressora.endereco,
    criadoEm: impressora.criadoEm.toISOString(),
    atualizadoEm: impressora.atualizadoEm.toISOString(),
  };
}
