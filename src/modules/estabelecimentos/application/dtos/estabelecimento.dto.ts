import type { Estabelecimento } from '../../domain/entities/estabelecimento.js';
import type { StatusRecurso } from '@shared/domain/status-recurso.js';

export interface EstabelecimentoDTO {
  idEstabelecimento: string;
  descricao: string;
  status: StatusRecurso;
  recursos: {
    impressoras: StatusRecurso;
    coletores: StatusRecurso;
    checklist: StatusRecurso;
    manufatura: StatusRecurso;
  };
  criadoEm: string;
  atualizadoEm: string;
}

export function paraEstabelecimentoDTO(estabelecimento: Estabelecimento): EstabelecimentoDTO {
  return {
    idEstabelecimento: estabelecimento.idEstabelecimento,
    descricao: estabelecimento.descricao,
    status: estabelecimento.status,
    recursos: estabelecimento.recursos,
    criadoEm: estabelecimento.criadoEm.toISOString(),
    atualizadoEm: estabelecimento.atualizadoEm.toISOString(),
  };
}
