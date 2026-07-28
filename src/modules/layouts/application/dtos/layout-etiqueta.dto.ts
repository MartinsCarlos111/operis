import type { LayoutEtiqueta } from '../../domain/entities/layout-etiqueta.js';

export interface LayoutEtiquetaDTO {
  idLayout: string;
  codigo: string;
  descricao: string;
  zpl: string;
  criadoEm: string;
  atualizadoEm: string;
}

export function paraLayoutEtiquetaDTO(l: LayoutEtiqueta): LayoutEtiquetaDTO {
  return {
    idLayout: l.idLayout,
    codigo: l.codigo,
    descricao: l.descricao,
    zpl: l.zpl,
    criadoEm: l.criadoEm.toISOString(),
    atualizadoEm: l.atualizadoEm.toISOString(),
  };
}
