import type { NivelAcesso } from '../../domain/entities/nivel-acesso.js';
import type { StatusRecurso } from '@shared/domain/status-recurso.js';

export interface NivelAcessoDTO {
  idNivelAcesso: string;
  nome: string;
  descricao: string;
  status: StatusRecurso;
  estabelecimentoId: string;
  permissaoIds: string[];
  criadoEm: string;
  atualizadoEm: string;
}

export function paraNivelAcessoDTO(nivel: NivelAcesso): NivelAcessoDTO {
  return {
    idNivelAcesso: nivel.idNivelAcesso,
    nome: nivel.nome,
    descricao: nivel.descricao,
    status: nivel.status,
    estabelecimentoId: nivel.estabelecimentoId,
    permissaoIds: [...nivel.permissaoIds],
    criadoEm: nivel.criadoEm.toISOString(),
    atualizadoEm: nivel.atualizadoEm.toISOString(),
  };
}
