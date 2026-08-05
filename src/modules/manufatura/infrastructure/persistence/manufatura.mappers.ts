import type {
  Calendario as CalendarioRow,
  CentroTrabalho as CentroTrabalhoRow,
  GrupoMaquina as GrupoMaquinaRow,
  Turno as TurnoRow,
  Reserva as ReservaRow,
  Prisma,
} from '@prisma/client';
import { Calendario } from '../../domain/entities/calendario.js';
import { GrupoMaquina } from '../../domain/entities/grupo-maquina.js';
import { CentroTrabalho } from '../../domain/entities/centro-trabalho.js';
import { Turno } from '../../domain/entities/turno.js';
import { Reserva } from '../../domain/entities/reserva.js';

/**
 * Tradução linha↔entidade. Sempre `restaurar` (não `criar`): a linha já
 * existia, não se reexecutam regras de criação.
 *
 * Os campos `Decimal` do Prisma viram `number` no domínio — as grandezas aqui
 * (metas em %, custo/hora, tamanho de lote) cabem com folga em double, e o
 * domínio não faz aritmética financeira acumulativa sobre elas.
 */

function numeroOuNulo(valor: Prisma.Decimal | null): number | null {
  return valor === null ? null : valor.toNumber();
}

export const CalendarioMapper = {
  paraDominio(row: CalendarioRow): Calendario {
    return Calendario.restaurar({
      idCalendario: row.idCalendario,
      codigo: row.codigo,
      descricao: row.descricao,
      status: row.status,
      estabelecimentoId: row.estabelecimentoId,
      criadoEm: row.criadoEm,
      atualizadoEm: row.atualizadoEm,
    });
  },

  paraPersistencia(calendario: Calendario) {
    return {
      idCalendario: calendario.idCalendario,
      codigo: calendario.codigo,
      descricao: calendario.descricao,
      status: calendario.status,
      estabelecimentoId: calendario.estabelecimentoId,
      criadoEm: calendario.criadoEm,
      atualizadoEm: calendario.atualizadoEm,
    };
  },
};

export const GrupoMaquinaMapper = {
  paraDominio(row: GrupoMaquinaRow): GrupoMaquina {
    return GrupoMaquina.restaurar({
      idGrupoMaquina: row.idGrupoMaquina,
      codigo: row.codigo,
      descricao: row.descricao,
      status: row.status,
      regraDespacho: row.regraDespacho,
      estabelecimentoId: row.estabelecimentoId,
      criadoEm: row.criadoEm,
      atualizadoEm: row.atualizadoEm,
    });
  },

  paraPersistencia(grupo: GrupoMaquina) {
    return {
      idGrupoMaquina: grupo.idGrupoMaquina,
      codigo: grupo.codigo,
      descricao: grupo.descricao,
      status: grupo.status,
      regraDespacho: grupo.regraDespacho,
      estabelecimentoId: grupo.estabelecimentoId,
      criadoEm: grupo.criadoEm,
      atualizadoEm: grupo.atualizadoEm,
    };
  },
};

export const CentroTrabalhoMapper = {
  paraDominio(row: CentroTrabalhoRow): CentroTrabalho {
    return CentroTrabalho.restaurar({
      idCentroTrabalho: row.idCentroTrabalho,
      codigo: row.codigo,
      descricao: row.descricao,
      status: row.status,
      estabelecimentoId: row.estabelecimentoId,
      calendarioId: row.calendarioId,
      vinculos: {
        grupoMaquinaId: row.grupoMaquinaId,
        tipoCausaId: row.tipoCausaId,
        tipoParadaId: row.tipoParadaId,
        tipoRecusaId: row.tipoRecusaId,
        tipoRefugoId: row.tipoRefugoId,
      },
      parametros: {
        controlaMaoObra: row.controlaMaoObra,
        preparacao: row.preparacao,
        operacaoBaixada: row.operacaoBaixada,
        tempoParadaPadraoMinutos: row.tempoParadaPadraoMinutos,
        tratamentoTempo: row.tratamentoTempo,
        tratamentoTempoLote: numeroOuNulo(row.tratamentoTempoLote),
        tipoUnidadeMedida: row.tipoUnidadeMedida,
      },
      metas: {
        metaDispTurno: numeroOuNulo(row.metaDispTurno),
        metaDesempTurno: numeroOuNulo(row.metaDesempTurno),
        metaQualiTurno: numeroOuNulo(row.metaQualiTurno),
        metaOeeTurno: numeroOuNulo(row.metaOeeTurno),
        custoMaquinaHora: row.custoMaquinaHora.toNumber(),
      },
      criadoEm: row.criadoEm,
      atualizadoEm: row.atualizadoEm,
    });
  },

  paraPersistencia(centro: CentroTrabalho) {
    const { vinculos, parametros, metas } = centro;
    return {
      idCentroTrabalho: centro.idCentroTrabalho,
      codigo: centro.codigo,
      descricao: centro.descricao,
      status: centro.status,
      estabelecimentoId: centro.estabelecimentoId,
      calendarioId: centro.calendarioId,
      grupoMaquinaId: vinculos.grupoMaquinaId,
      tipoCausaId: vinculos.tipoCausaId,
      tipoParadaId: vinculos.tipoParadaId,
      tipoRecusaId: vinculos.tipoRecusaId,
      tipoRefugoId: vinculos.tipoRefugoId,
      controlaMaoObra: parametros.controlaMaoObra,
      preparacao: parametros.preparacao,
      operacaoBaixada: parametros.operacaoBaixada,
      tempoParadaPadraoMinutos: parametros.tempoParadaPadraoMinutos,
      tratamentoTempo: parametros.tratamentoTempo,
      tratamentoTempoLote: parametros.tratamentoTempoLote,
      tipoUnidadeMedida: parametros.tipoUnidadeMedida,
      metaDispTurno: metas.metaDispTurno,
      metaDesempTurno: metas.metaDesempTurno,
      metaQualiTurno: metas.metaQualiTurno,
      metaOeeTurno: metas.metaOeeTurno,
      custoMaquinaHora: metas.custoMaquinaHora,
      criadoEm: centro.criadoEm,
      atualizadoEm: centro.atualizadoEm,
    };
  },
};

export const TurnoMapper = {
  paraDominio(row: TurnoRow): Turno {
    return Turno.restaurar({
      idTurno: row.idTurno,
      codigo: row.codigo,
      descricao: row.descricao,
      calendarioId: row.calendarioId,
      inicioMinutos: row.inicioMinutos,
      fimMinutos: row.fimMinutos,
      tempoTotalMinutos: row.tempoTotalMinutos,
      tempoDisponivelMinutos: row.tempoDisponivelMinutos,
      diasSemana: row.diasSemana,
      util: row.util,
      observacao: row.observacao,
      status: row.status,
      criadoEm: row.criadoEm,
      atualizadoEm: row.atualizadoEm,
    });
  },

  paraPersistencia(turno: Turno) {
    return {
      idTurno: turno.idTurno,
      codigo: turno.codigo,
      descricao: turno.descricao,
      calendarioId: turno.calendarioId,
      inicioMinutos: turno.inicioMinutos,
      fimMinutos: turno.fimMinutos,
      tempoTotalMinutos: turno.tempoTotalMinutos,
      tempoDisponivelMinutos: turno.tempoDisponivelMinutos,
      diasSemana: turno.diasSemana,
      util: turno.util,
      observacao: turno.observacao,
      status: turno.status,
      criadoEm: turno.criadoEm,
      atualizadoEm: turno.atualizadoEm,
    };
  },
};

export const ReservaMapper = {
  paraDominio(row: ReservaRow): Reserva {
    return Reserva.restaurar({
      idReserva: row.idReserva,
      ordemProducaoId: row.ordemProducaoId,
      sequencia: row.sequencia,
      itemCodigo: row.itemCodigo,
      itemDescricao: row.itemDescricao,
      lote: row.lote,
      unidadeMedida: row.unidadeMedida,
      quantidadeReserva: row.quantidadeReserva.toNumber(),
      quantidadeRequisitada: row.quantidadeRequisitada.toNumber(),
      quantidadeDevolvida: row.quantidadeDevolvida.toNumber(),
      requisicaoTerminal: row.requisicaoTerminal,
      status: row.status,
      criadoEm: row.criadoEm,
      atualizadoEm: row.atualizadoEm,
    });
  },

  paraPersistencia(reserva: Reserva) {
    return {
      idReserva: reserva.idReserva,
      ordemProducaoId: reserva.ordemProducaoId,
      sequencia: reserva.sequencia,
      itemCodigo: reserva.itemCodigo,
      itemDescricao: reserva.itemDescricao,
      lote: reserva.lote,
      unidadeMedida: reserva.unidadeMedida,
      quantidadeReserva: reserva.quantidadeReserva,
      quantidadeRequisitada: reserva.quantidadeRequisitada,
      quantidadeDevolvida: reserva.quantidadeDevolvida,
      requisicaoTerminal: reserva.requisicaoTerminal,
      status: reserva.status,
      criadoEm: reserva.criadoEm,
      atualizadoEm: reserva.atualizadoEm,
    };
  },
};
