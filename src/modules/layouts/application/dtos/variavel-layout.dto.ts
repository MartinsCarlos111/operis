import type { VariavelLayout } from '../../domain/entities/variavel-layout.js';

export interface VariavelLayoutDTO {
  idVariavel: string;
  codigo: string;
  descricao: string;
  campoEtiquetaManufatura: string;
  campoEtiquetaColetores: string;
  criadoEm: string;
  atualizadoEm: string;
}

export function paraVariavelLayoutDTO(v: VariavelLayout): VariavelLayoutDTO {
  return {
    idVariavel: v.idVariavel,
    codigo: v.codigo,
    descricao: v.descricao,
    campoEtiquetaManufatura: v.campoEtiquetaManufatura,
    campoEtiquetaColetores: v.campoEtiquetaColetores,
    criadoEm: v.criadoEm.toISOString(),
    atualizadoEm: v.atualizadoEm.toISOString(),
  };
}
