import type { Movimento as MovimentoRow, Prisma, PrismaClient } from '@prisma/client';
import { Movimento, type TipoMovimento } from '../../domain/entities/movimento.js';
import type {
  CatalogoTipos,
  CriterioListagemMovimento,
  MovimentoRepository,
} from '../../domain/repositories/movimento.repositories.js';

function num(valor: Prisma.Decimal | null): number | null {
  return valor === null ? null : valor.toNumber();
}

export const MovimentoMapper = {
  paraDominio(row: MovimentoRow): Movimento {
    return Movimento.restaurar({
      idMovimento: row.idMovimento,
      tipo: row.tipo,
      centroTrabalhoId: row.centroTrabalhoId,
      ordemProducaoId: row.ordemProducaoId,
      reservaId: row.reservaId,
      usuarioId: row.usuarioId,
      operador: row.operador,
      turnoId: row.turnoId,
      dataTurno: row.dataTurno,
      inicio: row.inicio,
      fim: row.fim,
      duracaoSegundos: row.duracaoSegundos,
      consideraOee: row.consideraOee,
      quantidades: {
        unidade: num(row.quantidadeUnidade),
        metragem: num(row.quantidadeMetragem),
        peso: num(row.quantidadePeso),
        area: num(row.quantidadeArea),
        volume: num(row.quantidadeVolume),
        especifica: num(row.quantidadeEspecifica),
      },
      tipoParadaId: row.tipoParadaId,
      tipoRefugoId: row.tipoRefugoId,
      tipoCausaId: row.tipoCausaId,
      tipoRecusaId: row.tipoRecusaId,
      manutencao: {
        tecnicoManutencao: row.tecnicoManutencao,
        ordemManutencao: row.ordemManutencao,
        fimSolicitacao: row.fimSolicitacao,
        fimManutencao: row.fimManutencao,
        descricaoCausa: row.descricaoCausa,
      },
      tempoSolicitacaoSegundos: row.tempoSolicitacaoSegundos,
      tempoManutencaoSegundos: row.tempoManutencaoSegundos,
      reportaErp: row.reportaErp,
      dataIntegracao: row.dataIntegracao,
      cancelado: row.cancelado,
      usuarioCancelamentoId: row.usuarioCancelamentoId,
      observacao: row.observacao,
      criadoEm: row.criadoEm,
      atualizadoEm: row.atualizadoEm,
    });
  },

  paraPersistencia(m: Movimento) {
    const q = m.quantidades;
    const mt = m.manutencao;
    return {
      idMovimento: m.idMovimento,
      tipo: m.tipo,
      centroTrabalhoId: m.centroTrabalhoId,
      ordemProducaoId: m.ordemProducaoId,
      reservaId: m.reservaId,
      usuarioId: m.usuarioId,
      operador: m.operador,
      turnoId: m.turnoId,
      dataTurno: m.dataTurno,
      inicio: m.inicio,
      fim: m.fim,
      duracaoSegundos: m.duracaoSegundos,
      consideraOee: m.consideraOee,
      quantidadeUnidade: q.unidade,
      quantidadeMetragem: q.metragem,
      quantidadePeso: q.peso,
      quantidadeArea: q.area,
      quantidadeVolume: q.volume,
      quantidadeEspecifica: q.especifica,
      tipoParadaId: m.tipoParadaId,
      tipoRefugoId: m.tipoRefugoId,
      tipoCausaId: m.tipoCausaId,
      tipoRecusaId: m.tipoRecusaId,
      tecnicoManutencao: mt.tecnicoManutencao,
      ordemManutencao: mt.ordemManutencao,
      fimSolicitacao: mt.fimSolicitacao,
      fimManutencao: mt.fimManutencao,
      descricaoCausa: mt.descricaoCausa,
      tempoSolicitacaoSegundos: m.tempoSolicitacaoSegundos,
      tempoManutencaoSegundos: m.tempoManutencaoSegundos,
      reportaErp: m.reportaErp,
      dataIntegracao: m.dataIntegracao,
      cancelado: m.cancelado,
      usuarioCancelamentoId: m.usuarioCancelamentoId,
      observacao: m.observacao,
      criadoEm: m.criadoEm,
      atualizadoEm: m.atualizadoEm,
    };
  },
};

export class PrismaMovimentoRepository implements MovimentoRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private where(criterio: CriterioListagemMovimento) {
    return {
      centroTrabalho: { estabelecimentoId: criterio.estabelecimentoId },
      ...(criterio.centroTrabalhoId ? { centroTrabalhoId: criterio.centroTrabalhoId } : {}),
      ...(criterio.ordemProducaoId ? { ordemProducaoId: criterio.ordemProducaoId } : {}),
      ...(criterio.tipo ? { tipo: criterio.tipo } : {}),
    };
  }

  async buscarPorId(id: string, estabelecimentoId: string): Promise<Movimento | null> {
    const row = await this.prisma.movimento.findFirst({
      where: { idMovimento: id, centroTrabalho: { estabelecimentoId } },
    });
    return row ? MovimentoMapper.paraDominio(row) : null;
  }

  /** "Aberto" = sem fim. O mais recente por início, como no legado. */
  async buscarAberto(centroTrabalhoId: string, tipos: TipoMovimento[]): Promise<Movimento | null> {
    const row = await this.prisma.movimento.findFirst({
      where: { centroTrabalhoId, fim: null, cancelado: false, tipo: { in: tipos } },
      orderBy: { inicio: 'desc' },
    });
    return row ? MovimentoMapper.paraDominio(row) : null;
  }

  async listar(criterio: CriterioListagemMovimento): Promise<Movimento[]> {
    const rows = await this.prisma.movimento.findMany({
      where: this.where(criterio),
      orderBy: { inicio: 'desc' },
      skip: criterio.startIndex,
      take: criterio.maxRows,
    });
    return rows.map(MovimentoMapper.paraDominio);
  }

  async contar(criterio: CriterioListagemMovimento): Promise<number> {
    return this.prisma.movimento.count({ where: this.where(criterio) });
  }

  async salvar(movimento: Movimento): Promise<void> {
    const data = MovimentoMapper.paraPersistencia(movimento);
    const { idMovimento: _id, criadoEm: _criadoEm, ...mutaveis } = data;
    void _id;
    void _criadoEm;
    await this.prisma.movimento.upsert({
      where: { idMovimento: data.idMovimento },
      create: data,
      update: mutaveis,
    });
  }
}

/**
 * Catálogo de classificações com autocadastro. O `upsert` do Prisma resolve o
 * "busca, e se não achar cria" do legado numa ida só ao banco, sem janela de
 * corrida entre dois terminais reportando o mesmo código novo.
 *
 * A descrição do tipo autocadastrado é o próprio código — é o que o legado faz
 * (`DsTipoParada = movimento.TipoParada.CdTipoParada`), deixando o cadastro
 * correto para alguém revisar depois no site.
 */
export class PrismaCatalogoTipos implements CatalogoTipos {
  constructor(private readonly prisma: PrismaClient) {}

  async resolverParada(codigo: string, estabelecimentoId: string, autocadastrar: boolean) {
    const chave = { estabelecimentoId_codigo: { estabelecimentoId, codigo } };
    if (autocadastrar) {
      // Criticidade fica no default NORMAL — exatamente o que o RN faz.
      const row = await this.prisma.tipoParada.upsert({
        where: chave,
        create: { codigo, descricao: codigo, estabelecimentoId },
        update: {},
      });
      return row.idTipoParada;
    }
    const row = await this.prisma.tipoParada.findUnique({ where: chave });
    return row?.idTipoParada ?? null;
  }

  async resolverRefugo(codigo: string, estabelecimentoId: string, autocadastrar: boolean) {
    const chave = { estabelecimentoId_codigo: { estabelecimentoId, codigo } };
    if (autocadastrar) {
      const row = await this.prisma.tipoRefugo.upsert({
        where: chave,
        create: { codigo, descricao: codigo, estabelecimentoId },
        update: {},
      });
      return row.idTipoRefugo;
    }
    const row = await this.prisma.tipoRefugo.findUnique({ where: chave });
    return row?.idTipoRefugo ?? null;
  }

  async resolverCausa(codigo: string, estabelecimentoId: string, autocadastrar: boolean) {
    const chave = { estabelecimentoId_codigo: { estabelecimentoId, codigo } };
    if (autocadastrar) {
      const row = await this.prisma.tipoCausa.upsert({
        where: chave,
        create: { codigo, descricao: codigo, estabelecimentoId },
        update: {},
      });
      return row.idTipoCausa;
    }
    const row = await this.prisma.tipoCausa.findUnique({ where: chave });
    return row?.idTipoCausa ?? null;
  }

  async resolverRecusa(codigo: string, estabelecimentoId: string, autocadastrar: boolean) {
    const chave = { estabelecimentoId_codigo: { estabelecimentoId, codigo } };
    if (autocadastrar) {
      const row = await this.prisma.tipoRecusa.upsert({
        where: chave,
        create: { codigo, descricao: codigo, estabelecimentoId },
        update: {},
      });
      return row.idTipoRecusa;
    }
    const row = await this.prisma.tipoRecusa.findUnique({ where: chave });
    return row?.idTipoRecusa ?? null;
  }
}
