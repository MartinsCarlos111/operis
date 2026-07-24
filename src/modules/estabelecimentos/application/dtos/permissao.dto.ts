import type { Permissao } from '../../domain/entities/permissao.js';

export interface PermissaoDTO {
  idPermissao: string;
  chave: string;
  grupo: string;
  descricao: string;
}

export function paraPermissaoDTO(permissao: Permissao): PermissaoDTO {
  return {
    idPermissao: permissao.idPermissao,
    chave: permissao.chave.valor,
    grupo: permissao.grupo,
    descricao: permissao.descricao,
  };
}
