import type { RegraNotificacao as RegraRow } from '@prisma/client';
import { RegraNotificacao } from '../../domain/entities/regra-notificacao.js';

export const RegraNotificacaoMapper = {
  paraDominio(row: RegraRow): RegraNotificacao {
    return RegraNotificacao.restaurar({
      idRegraNotificacao: row.idRegraNotificacao,
      codigo: row.codigo,
      descricao: row.descricao,
      destinatarios: row.destinatarios,
      produto: row.produto,
      tabela: row.tabela,
      conteudo: row.conteudo,
      status: row.status,
      criadoEm: row.criadoEm,
      atualizadoEm: row.atualizadoEm,
    });
  },

  paraPersistencia(regra: RegraNotificacao): RegraRow {
    return {
      idRegraNotificacao: regra.idRegraNotificacao,
      codigo: regra.codigo,
      descricao: regra.descricao,
      destinatarios: regra.destinatarios,
      produto: regra.produto,
      tabela: regra.tabela,
      conteudo: regra.conteudo,
      status: regra.status,
      criadoEm: regra.criadoEm,
      atualizadoEm: regra.atualizadoEm,
    };
  },
};
