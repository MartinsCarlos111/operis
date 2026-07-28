import type { RegraNotificacao } from '../../domain/entities/regra-notificacao.js';
import type { StatusRecurso } from '@shared/domain/status-recurso.js';

/**
 * Saída de uma Regra de Notificação. Espelha o RegraNotificacaoModel do Octopus
 * (cdRegraNotificacao/dsRegraNotificacao/…/ativo) com vocabulário do operis.
 */
export interface RegraNotificacaoDTO {
  idRegraNotificacao: string;
  codigo: string;
  descricao: string;
  destinatarios: string;
  produto: string;
  tabela: string;
  conteudo: string;
  status: StatusRecurso;
  criadoEm: string;
  atualizadoEm: string;
}

export function paraRegraNotificacaoDTO(regra: RegraNotificacao): RegraNotificacaoDTO {
  return {
    idRegraNotificacao: regra.idRegraNotificacao,
    codigo: regra.codigo,
    descricao: regra.descricao,
    destinatarios: regra.destinatarios,
    produto: regra.produto,
    tabela: regra.tabela,
    conteudo: regra.conteudo,
    status: regra.status,
    criadoEm: regra.criadoEm.toISOString(),
    atualizadoEm: regra.atualizadoEm.toISOString(),
  };
}
