import type { Area } from '../../domain/entities/area.js';

/**
 * Representação de saída de uma Área. Espelha o AreaModel do Octopus
 * (idArea, cdArea, dsArea, idEstabelecimento, dtAtualizacao) com o vocabulário
 * do operis: `codigo`/`descricao` no lugar de `cdArea`/`dsArea`. As colunas
 * Aux do legado foram descartadas (não eram expostas pela API).
 */
export interface AreaDTO {
  idArea: string;
  codigo: string;
  descricao: string;
  idEstabelecimento: string;
  criadoEm: string;
  atualizadoEm: string;
}

export function paraAreaDTO(area: Area): AreaDTO {
  return {
    idArea: area.idArea,
    codigo: area.codigo,
    descricao: area.descricao,
    idEstabelecimento: area.estabelecimentoId,
    criadoEm: area.criadoEm.toISOString(),
    atualizadoEm: area.atualizadoEm.toISOString(),
  };
}
