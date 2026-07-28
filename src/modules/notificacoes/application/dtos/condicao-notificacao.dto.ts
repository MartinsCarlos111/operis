import type { CondicaoNotificacao } from '../../domain/entities/condicao-notificacao.js';

/** Saída de uma Condição de Notificação (ex-CondicaoNotificacaoModel). */
export interface CondicaoNotificacaoDTO {
  idCondicaoNotificacao: string;
  idRegraNotificacao: string;
  campo: string;
  operador: string;
  valor: string;
  criadoEm: string;
  atualizadoEm: string;
}

export function paraCondicaoNotificacaoDTO(condicao: CondicaoNotificacao): CondicaoNotificacaoDTO {
  return {
    idCondicaoNotificacao: condicao.idCondicaoNotificacao,
    idRegraNotificacao: condicao.regraNotificacaoId,
    campo: condicao.campo,
    operador: condicao.operador,
    valor: condicao.valor,
    criadoEm: condicao.criadoEm.toISOString(),
    atualizadoEm: condicao.atualizadoEm.toISOString(),
  };
}
