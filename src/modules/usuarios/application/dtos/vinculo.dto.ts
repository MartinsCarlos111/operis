import type { UsuarioEstabelecimento } from '../../domain/entities/usuario-estabelecimento.js';
import type { StatusRecurso } from '@shared/domain/status-recurso.js';

export interface VinculoDTO {
  usuarioId: string;
  estabelecimentoId: string;
  nivelAcessoId: string;
  status: StatusRecurso;
  criadoEm: string;
  atualizadoEm: string;
}

export function paraVinculoDTO(vinculo: UsuarioEstabelecimento): VinculoDTO {
  return {
    usuarioId: vinculo.usuarioId,
    estabelecimentoId: vinculo.estabelecimentoId,
    nivelAcessoId: vinculo.nivelAcessoId,
    status: vinculo.status,
    criadoEm: vinculo.criadoEm.toISOString(),
    atualizadoEm: vinculo.atualizadoEm.toISOString(),
  };
}
