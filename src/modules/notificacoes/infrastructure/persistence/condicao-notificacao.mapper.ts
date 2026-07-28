import type { CondicaoNotificacao as CondicaoRow } from '@prisma/client';
import { CondicaoNotificacao } from '../../domain/entities/condicao-notificacao.js';

export const CondicaoNotificacaoMapper = {
  paraDominio(row: CondicaoRow): CondicaoNotificacao {
    return CondicaoNotificacao.restaurar({
      idCondicaoNotificacao: row.idCondicaoNotificacao,
      regraNotificacaoId: row.regraNotificacaoId,
      campo: row.campo,
      operador: row.operador,
      valor: row.valor,
      criadoEm: row.criadoEm,
      atualizadoEm: row.atualizadoEm,
    });
  },

  paraPersistencia(condicao: CondicaoNotificacao): CondicaoRow {
    return {
      idCondicaoNotificacao: condicao.idCondicaoNotificacao,
      regraNotificacaoId: condicao.regraNotificacaoId,
      campo: condicao.campo,
      operador: condicao.operador,
      valor: condicao.valor,
      criadoEm: condicao.criadoEm,
      atualizadoEm: condicao.atualizadoEm,
    };
  },
};
