import type { Prisma, PrismaClient } from '@prisma/client';
import type { Calendario } from '../../domain/entities/calendario.js';
import type { GrupoMaquina } from '../../domain/entities/grupo-maquina.js';
import type { CentroTrabalho } from '../../domain/entities/centro-trabalho.js';
import type { Turno } from '../../domain/entities/turno.js';
import type { Reserva } from '../../domain/entities/reserva.js';
import type { QualidadeItem } from '../../domain/entities/qualidade-item.js';
import type { Item } from '../../domain/entities/item.js';
import type { CentroTrabalhoItem } from '../../domain/entities/centro-trabalho-item.js';
import { OrdemProducao } from '../../domain/entities/ordem-producao.js';
import type {
  CalendarioRepository,
  CentroTrabalhoRepository,
  CriterioListagem,
  CriterioListagemTurnoRepo,
  CriterioListagemReserva,
  GrupoMaquinaRepository,
  QualidadeItemRepository,
  ItemRepository,
  CentroTrabalhoItemRepository,
  CriterioListagemCentroTrabalhoItem,
  ReservaRepository,
  TurnoRepository,
} from '../../domain/repositories/manufatura.repositories.js';
import type { CriterioOrdemProducao, OrdemProducaoRepository } from '../../domain/repositories/ordem-producao.repositories.js';
import {
  TurnoMapper,
  ReservaMapper,
  CalendarioMapper,
  CentroTrabalhoMapper,
  GrupoMaquinaMapper,
  QualidadeItemMapper,
  ItemMapper,
  CentroTrabalhoItemMapper,
} from './manufatura.mappers.js';

type OrdemRow = Record<string, unknown>;
type OrdemDelegate = {
  findFirst(args: unknown): Promise<OrdemRow | null>;
  findUnique(args: unknown): Promise<OrdemRow | null>;
  findMany(args: unknown): Promise<OrdemRow[]>;
  count(args: unknown): Promise<number>;
  create(args: { data: unknown }): Promise<unknown>;
};

/**
 * Adaptadores Prisma dos cadastros de manufatura.
 *
 * O filtro de grid do legado (`jsonConditions`, que virava SQL montado por
 * string) vira busca textual tipada sobre código/descrição, sempre escopada ao
 * estabelecimento ativo — mesma tradução já feita em Áreas.
 */
function montarWhere(estabelecimentoId: string, termo?: string) {
  const limpo = termo?.trim();
  if (!limpo) return { estabelecimentoId };
  return {
    estabelecimentoId,
    OR: [
      { codigo: { contains: limpo, mode: 'insensitive' as Prisma.QueryMode } },
      { descricao: { contains: limpo, mode: 'insensitive' as Prisma.QueryMode } },
    ],
  };
}

export class PrismaCalendarioRepository implements CalendarioRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async buscarPorId(id: string, estabelecimentoId: string): Promise<Calendario | null> {
    const row = await this.prisma.calendario.findFirst({
      where: { idCalendario: id, estabelecimentoId },
    });
    return row ? CalendarioMapper.paraDominio(row) : null;
  }

  async buscarPorCodigo(codigo: string, estabelecimentoId: string): Promise<Calendario | null> {
    const row = await this.prisma.calendario.findUnique({
      where: { estabelecimentoId_codigo: { estabelecimentoId, codigo } },
    });
    return row ? CalendarioMapper.paraDominio(row) : null;
  }

  async listar(criterio: CriterioListagem): Promise<Calendario[]> {
    const rows = await this.prisma.calendario.findMany({
      where: montarWhere(criterio.estabelecimentoId, criterio.termo),
      orderBy: { codigo: 'asc' },
      skip: criterio.startIndex,
      take: criterio.maxRows,
    });
    return rows.map(CalendarioMapper.paraDominio);
  }

  async contar(estabelecimentoId: string, termo?: string): Promise<number> {
    return this.prisma.calendario.count({ where: montarWhere(estabelecimentoId, termo) });
  }

  async salvar(calendario: Calendario): Promise<void> {
    const data = CalendarioMapper.paraPersistencia(calendario);
    await this.prisma.calendario.upsert({
      where: { idCalendario: data.idCalendario },
      create: data,
      update: {
        codigo: data.codigo,
        descricao: data.descricao,
        status: data.status,
        atualizadoEm: data.atualizadoEm,
      },
    });
  }

  async excluir(id: string): Promise<void> {
    await this.prisma.calendario.delete({ where: { idCalendario: id } });
  }

  async contarCentrosTrabalho(id: string): Promise<number> {
    return this.prisma.centroTrabalho.count({ where: { calendarioId: id } });
  }
}

export class PrismaGrupoMaquinaRepository implements GrupoMaquinaRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async buscarPorId(id: string, estabelecimentoId: string): Promise<GrupoMaquina | null> {
    const row = await this.prisma.grupoMaquina.findFirst({
      where: { idGrupoMaquina: id, estabelecimentoId },
    });
    return row ? GrupoMaquinaMapper.paraDominio(row) : null;
  }

  async buscarPorCodigo(codigo: string, estabelecimentoId: string): Promise<GrupoMaquina | null> {
    const row = await this.prisma.grupoMaquina.findUnique({
      where: { estabelecimentoId_codigo: { estabelecimentoId, codigo } },
    });
    return row ? GrupoMaquinaMapper.paraDominio(row) : null;
  }

  async listar(criterio: CriterioListagem): Promise<GrupoMaquina[]> {
    const rows = await this.prisma.grupoMaquina.findMany({
      where: montarWhere(criterio.estabelecimentoId, criterio.termo),
      orderBy: { codigo: 'asc' },
      skip: criterio.startIndex,
      take: criterio.maxRows,
    });
    return rows.map(GrupoMaquinaMapper.paraDominio);
  }

  async contar(estabelecimentoId: string, termo?: string): Promise<number> {
    return this.prisma.grupoMaquina.count({ where: montarWhere(estabelecimentoId, termo) });
  }

  async salvar(grupo: GrupoMaquina): Promise<void> {
    const data = GrupoMaquinaMapper.paraPersistencia(grupo);
    await this.prisma.grupoMaquina.upsert({
      where: { idGrupoMaquina: data.idGrupoMaquina },
      create: data,
      update: {
        codigo: data.codigo,
        descricao: data.descricao,
        status: data.status,
        regraDespacho: data.regraDespacho,
        atualizadoEm: data.atualizadoEm,
      },
    });
  }

  async excluir(id: string): Promise<void> {
    await this.prisma.grupoMaquina.delete({ where: { idGrupoMaquina: id } });
  }

  async contarCentrosTrabalho(id: string): Promise<number> {
    return this.prisma.centroTrabalho.count({ where: { grupoMaquinaId: id } });
  }
}

/** QualidadeItem só tem descrição (sem código), por isso um where próprio. */
function montarWhereQualidadeItem(estabelecimentoId: string, termo?: string) {
  const limpo = termo?.trim();
  if (!limpo) return { estabelecimentoId };
  return {
    estabelecimentoId,
    descricao: { contains: limpo, mode: 'insensitive' as Prisma.QueryMode },
  };
}

export class PrismaQualidadeItemRepository implements QualidadeItemRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async buscarPorId(id: string, estabelecimentoId: string): Promise<QualidadeItem | null> {
    const row = await this.prisma.qualidadeItem.findFirst({
      where: { idQualidadeItem: id, estabelecimentoId },
    });
    return row ? QualidadeItemMapper.paraDominio(row) : null;
  }

  async buscarPorDescricao(descricao: string, estabelecimentoId: string): Promise<QualidadeItem | null> {
    const row = await this.prisma.qualidadeItem.findUnique({
      where: { estabelecimentoId_descricao: { estabelecimentoId, descricao } },
    });
    return row ? QualidadeItemMapper.paraDominio(row) : null;
  }

  async listar(criterio: CriterioListagem): Promise<QualidadeItem[]> {
    const rows = await this.prisma.qualidadeItem.findMany({
      where: montarWhereQualidadeItem(criterio.estabelecimentoId, criterio.termo),
      orderBy: { descricao: 'asc' },
      skip: criterio.startIndex,
      take: criterio.maxRows,
    });
    return rows.map(QualidadeItemMapper.paraDominio);
  }

  async contar(estabelecimentoId: string, termo?: string): Promise<number> {
    return this.prisma.qualidadeItem.count({
      where: montarWhereQualidadeItem(estabelecimentoId, termo),
    });
  }

  async salvar(qualidade: QualidadeItem): Promise<void> {
    const data = QualidadeItemMapper.paraPersistencia(qualidade);
    await this.prisma.qualidadeItem.upsert({
      where: { idQualidadeItem: data.idQualidadeItem },
      create: data,
      update: {
        descricao: data.descricao,
        atualizadoEm: data.atualizadoEm,
      },
    });
  }

  async excluir(id: string): Promise<void> {
    await this.prisma.qualidadeItem.delete({ where: { idQualidadeItem: id } });
  }
}

const incluiQualidades = { qualidades: { select: { qualidadeItemId: true as const } } };

/**
 * Adaptador Prisma de Item. A junção N:N com QualidadeItem é detalhe daqui:
 * `salvar` sincroniza o Set de qualidadeItemIds com `ItemQualidadeItem` numa
 * transação (apaga e recria a seleção) — mesmo padrão de PrismaNivelAcessoRepository.
 */
export class PrismaItemRepository implements ItemRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async buscarPorId(id: string, estabelecimentoId: string): Promise<Item | null> {
    const row = await this.prisma.item.findFirst({
      where: { idItem: id, estabelecimentoId },
      include: incluiQualidades,
    });
    return row ? ItemMapper.paraDominio(row) : null;
  }

  async buscarPorCodigo(codigo: string, estabelecimentoId: string): Promise<Item | null> {
    const row = await this.prisma.item.findUnique({
      where: { estabelecimentoId_codigo: { estabelecimentoId, codigo } },
      include: incluiQualidades,
    });
    return row ? ItemMapper.paraDominio(row) : null;
  }

  async listar(criterio: CriterioListagem): Promise<Item[]> {
    const rows = await this.prisma.item.findMany({
      where: montarWhere(criterio.estabelecimentoId, criterio.termo),
      include: incluiQualidades,
      orderBy: { codigo: 'asc' },
      skip: criterio.startIndex,
      take: criterio.maxRows,
    });
    return rows.map(ItemMapper.paraDominio);
  }

  async contar(estabelecimentoId: string, termo?: string): Promise<number> {
    return this.prisma.item.count({ where: montarWhere(estabelecimentoId, termo) });
  }

  async salvar(item: Item): Promise<void> {
    const data = ItemMapper.paraPersistencia(item);
    const qualidadeItemIds = [...item.qualidadeItemIds];
    await this.prisma.$transaction([
      this.prisma.item.upsert({
        where: { idItem: data.idItem },
        create: data,
        update: {
          codigo: data.codigo,
          descricao: data.descricao,
          status: data.status,
          atualizadoEm: data.atualizadoEm,
        },
      }),
      this.prisma.itemQualidadeItem.deleteMany({ where: { itemId: item.idItem } }),
      this.prisma.itemQualidadeItem.createMany({
        data: qualidadeItemIds.map((qualidadeItemId) => ({
          itemId: item.idItem,
          qualidadeItemId,
        })),
      }),
    ]);
  }

  async excluir(id: string): Promise<void> {
    await this.prisma.item.delete({ where: { idItem: id } });
  }
}

function whereCentroTrabalhoItem(criterio: Omit<CriterioListagemCentroTrabalhoItem, 'startIndex' | 'maxRows'>) {
  return {
    item: { estabelecimentoId: criterio.estabelecimentoId },
    ...(criterio.itemId ? { itemId: criterio.itemId } : {}),
    ...(criterio.centroTrabalhoId ? { centroTrabalhoId: criterio.centroTrabalhoId } : {}),
  };
}

/**
 * Adaptador Prisma do vínculo Item × Centro de Trabalho. O escopo por
 * estabelecimento vem pela relação com Item (mesma proteção usada em Turno,
 * escopado via `calendario.estabelecimentoId`).
 */
export class PrismaCentroTrabalhoItemRepository implements CentroTrabalhoItemRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async buscarPorId(id: string, estabelecimentoId: string): Promise<CentroTrabalhoItem | null> {
    const row = await this.prisma.centroTrabalhoItem.findFirst({
      where: { idCentroTrabalhoItem: id, item: { estabelecimentoId } },
    });
    return row ? CentroTrabalhoItemMapper.paraDominio(row) : null;
  }

  async buscarPorItemECentro(
    itemId: string,
    centroTrabalhoId: string,
    estabelecimentoId: string,
  ): Promise<CentroTrabalhoItem | null> {
    const row = await this.prisma.centroTrabalhoItem.findFirst({
      where: { itemId, centroTrabalhoId, item: { estabelecimentoId } },
    });
    return row ? CentroTrabalhoItemMapper.paraDominio(row) : null;
  }

  async listar(criterio: CriterioListagemCentroTrabalhoItem): Promise<CentroTrabalhoItem[]> {
    const rows = await this.prisma.centroTrabalhoItem.findMany({
      where: whereCentroTrabalhoItem(criterio),
      orderBy: { criadoEm: 'asc' },
      skip: criterio.startIndex,
      take: criterio.maxRows,
    });
    return rows.map(CentroTrabalhoItemMapper.paraDominio);
  }

  async contar(
    criterio: Omit<CriterioListagemCentroTrabalhoItem, 'startIndex' | 'maxRows'>,
  ): Promise<number> {
    return this.prisma.centroTrabalhoItem.count({ where: whereCentroTrabalhoItem(criterio) });
  }

  async salvar(vinculo: CentroTrabalhoItem): Promise<void> {
    const data = CentroTrabalhoItemMapper.paraPersistencia(vinculo);
    await this.prisma.centroTrabalhoItem.upsert({
      where: { idCentroTrabalhoItem: data.idCentroTrabalhoItem },
      create: data,
      update: {
        cicloProdutivoHora: data.cicloProdutivoHora,
        cicloProdutivoPecaSegundos: data.cicloProdutivoPecaSegundos,
        tempoPreparacaoSegundos: data.tempoPreparacaoSegundos,
        fatorRefugo: data.fatorRefugo,
        qtdRefugo: data.qtdRefugo,
        qtdPerda: data.qtdPerda,
        apontarPreparacao: data.apontarPreparacao,
        tempoMaquinaSegundos: data.tempoMaquinaSegundos,
        loteMultiplo: data.loteMultiplo,
        ativo: data.ativo,
        atualizadoEm: data.atualizadoEm,
      },
    });
  }

  async excluir(id: string): Promise<void> {
    await this.prisma.centroTrabalhoItem.delete({ where: { idCentroTrabalhoItem: id } });
  }
}

export class PrismaCentroTrabalhoRepository implements CentroTrabalhoRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async buscarPorId(id: string, estabelecimentoId: string): Promise<CentroTrabalho | null> {
    const row = await this.prisma.centroTrabalho.findFirst({
      where: { idCentroTrabalho: id, estabelecimentoId },
    });
    return row ? CentroTrabalhoMapper.paraDominio(row) : null;
  }

  async buscarPorCodigo(codigo: string, estabelecimentoId: string): Promise<CentroTrabalho | null> {
    const row = await this.prisma.centroTrabalho.findUnique({
      where: { estabelecimentoId_codigo: { estabelecimentoId, codigo } },
    });
    return row ? CentroTrabalhoMapper.paraDominio(row) : null;
  }

  async listar(criterio: CriterioListagem): Promise<CentroTrabalho[]> {
    const rows = await this.prisma.centroTrabalho.findMany({
      where: montarWhere(criterio.estabelecimentoId, criterio.termo),
      orderBy: { codigo: 'asc' },
      skip: criterio.startIndex,
      take: criterio.maxRows,
    });
    return rows.map(CentroTrabalhoMapper.paraDominio);
  }

  async contar(estabelecimentoId: string, termo?: string): Promise<number> {
    return this.prisma.centroTrabalho.count({ where: montarWhere(estabelecimentoId, termo) });
  }

  async salvar(centro: CentroTrabalho): Promise<void> {
    const data = CentroTrabalhoMapper.paraPersistencia(centro);
    const { idCentroTrabalho: _id, criadoEm: _criadoEm, ...mutaveis } = data;
    void _id;
    void _criadoEm;
    await this.prisma.centroTrabalho.upsert({
      where: { idCentroTrabalho: data.idCentroTrabalho },
      create: data,
      update: mutaveis,
    });
  }

  async excluir(id: string): Promise<void> {
    await this.prisma.centroTrabalho.delete({ where: { idCentroTrabalho: id } });
  }
}

export class PrismaOrdemProducaoRepository implements OrdemProducaoRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private get ordens(): OrdemDelegate {
    return (this.prisma as unknown as { ordemProducao: OrdemDelegate }).ordemProducao;
  }

  async buscarPorId(id: string, estabelecimentoId: string): Promise<OrdemProducao | null> {
    const row = await this.ordens.findFirst({ where: { idOrdemProducao: id, estabelecimentoId } });
    return row ? OrdemProducao.restaurar(row as never) : null;
  }

  async buscarPorIdentidade(codigo: string, identificador: string): Promise<OrdemProducao | null> {
    const row = await this.ordens.findUnique({ where: { codigo_identificador: { codigo, identificador } } });
    return row ? OrdemProducao.restaurar(row as never) : null;
  }

  async listar(criterio: CriterioOrdemProducao): Promise<OrdemProducao[]> {
    const termo = criterio.termo?.trim();
    const rows = await this.ordens.findMany({
      where: {
        estabelecimentoId: criterio.estabelecimentoId,
        ...(criterio.status ? { status: criterio.status as never } : {}),
        ...(termo ? { OR: [{ codigo: { contains: termo, mode: 'insensitive' } }, { identificador: { contains: termo, mode: 'insensitive' } }, { itemCodigo: { contains: termo, mode: 'insensitive' } }] } : {}),
      },
      orderBy: [{ inicioPlanejado: 'asc' }, { codigo: 'asc' }],
      skip: criterio.startIndex,
      take: criterio.maxRows,
    });
    return rows.map((row) => OrdemProducao.restaurar(row as never));
  }

  async contar(criterio: Omit<CriterioOrdemProducao, 'startIndex' | 'maxRows'>): Promise<number> {
    const termo = criterio.termo?.trim();
    return this.ordens.count({
      where: {
        estabelecimentoId: criterio.estabelecimentoId,
        ...(criterio.status ? { status: criterio.status as never } : {}),
        ...(termo ? { OR: [{ codigo: { contains: termo, mode: 'insensitive' } }, { identificador: { contains: termo, mode: 'insensitive' } }, { itemCodigo: { contains: termo, mode: 'insensitive' } }] } : {}),
      },
    });
  }

  async salvar(ordem: OrdemProducao): Promise<void> {
    const data = ordem.dados;
    await this.ordens.create({ data: {
      ...data,
      idOrdemProducao: data.idOrdemProducao,
      unidadeMedida: data.unidadeMedida ?? 'UNIDADE',
      origem: data.origem ?? 'OCTOPUS',
      modoDistribuicao: data.modoDistribuicao ?? 'PUXADA',
      status: data.status ?? 'LIBERADA',
    } });
  }
}

/**
 * Turno é escopado pelo calendário; o escopo por estabelecimento é aplicado
 * via a relação (`calendario.estabelecimentoId`), para que um id de outro
 * estabelecimento não vaze — mesma proteção dos demais repositórios.
 */
export class PrismaTurnoRepository implements TurnoRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private where(criterio: CriterioListagemTurnoRepo) {
    const limpo = criterio.termo?.trim();
    return {
      calendario: { estabelecimentoId: criterio.estabelecimentoId },
      ...(criterio.calendarioId ? { calendarioId: criterio.calendarioId } : {}),
      ...(limpo
        ? {
            OR: [
              { codigo: { contains: limpo, mode: 'insensitive' as Prisma.QueryMode } },
              { descricao: { contains: limpo, mode: 'insensitive' as Prisma.QueryMode } },
            ],
          }
        : {}),
    };
  }

  async buscarPorId(id: string, estabelecimentoId: string): Promise<Turno | null> {
    const row = await this.prisma.turno.findFirst({
      where: { idTurno: id, calendario: { estabelecimentoId } },
    });
    return row ? TurnoMapper.paraDominio(row) : null;
  }

  async buscarPorCodigo(codigo: string, calendarioId: string): Promise<Turno | null> {
    const row = await this.prisma.turno.findUnique({
      where: { calendarioId_codigo: { calendarioId, codigo } },
    });
    return row ? TurnoMapper.paraDominio(row) : null;
  }

  async listar(criterio: CriterioListagemTurnoRepo): Promise<Turno[]> {
    const rows = await this.prisma.turno.findMany({
      where: this.where(criterio),
      orderBy: [{ calendarioId: 'asc' }, { inicioMinutos: 'asc' }],
      skip: criterio.startIndex,
      take: criterio.maxRows,
    });
    return rows.map(TurnoMapper.paraDominio);
  }

  async contar(criterio: CriterioListagemTurnoRepo): Promise<number> {
    return this.prisma.turno.count({ where: this.where(criterio) });
  }

  async salvar(turno: Turno): Promise<void> {
    const data = TurnoMapper.paraPersistencia(turno);
    const { idTurno: _id, criadoEm: _criadoEm, ...mutaveis } = data;
    void _id;
    void _criadoEm;
    await this.prisma.turno.upsert({
      where: { idTurno: data.idTurno },
      create: data,
      update: mutaveis,
    });
  }

  async excluir(id: string): Promise<void> {
    await this.prisma.turno.delete({ where: { idTurno: id } });
  }
}

/**
 * Reserva é escopada pela ordem de produção; o escopo por estabelecimento vem
 * pela relação (`ordemProducao.estabelecimentoId`), como nos demais.
 */
export class PrismaReservaRepository implements ReservaRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private where(criterio: CriterioListagemReserva) {
    const limpo = criterio.termo?.trim();
    return {
      ordemProducao: { estabelecimentoId: criterio.estabelecimentoId },
      ...(criterio.ordemProducaoId ? { ordemProducaoId: criterio.ordemProducaoId } : {}),
      ...(limpo
        ? {
            OR: [
              { itemCodigo: { contains: limpo, mode: 'insensitive' as Prisma.QueryMode } },
              { itemDescricao: { contains: limpo, mode: 'insensitive' as Prisma.QueryMode } },
            ],
          }
        : {}),
    };
  }

  async buscarPorId(id: string, estabelecimentoId: string): Promise<Reserva | null> {
    const row = await this.prisma.reserva.findFirst({
      where: { idReserva: id, ordemProducao: { estabelecimentoId } },
    });
    return row ? ReservaMapper.paraDominio(row) : null;
  }

  async buscarPorIdentidade(
    ordemProducaoId: string,
    itemCodigo: string,
    sequencia: number,
  ): Promise<Reserva | null> {
    const row = await this.prisma.reserva.findUnique({
      where: {
        ordemProducaoId_itemCodigo_sequencia: { ordemProducaoId, itemCodigo, sequencia },
      },
    });
    return row ? ReservaMapper.paraDominio(row) : null;
  }

  async listar(criterio: CriterioListagemReserva): Promise<Reserva[]> {
    const rows = await this.prisma.reserva.findMany({
      where: this.where(criterio),
      orderBy: [{ ordemProducaoId: 'asc' }, { sequencia: 'asc' }],
      skip: criterio.startIndex,
      take: criterio.maxRows,
    });
    return rows.map(ReservaMapper.paraDominio);
  }

  async contar(criterio: CriterioListagemReserva): Promise<number> {
    return this.prisma.reserva.count({ where: this.where(criterio) });
  }

  async salvar(reserva: Reserva): Promise<void> {
    const data = ReservaMapper.paraPersistencia(reserva);
    const { idReserva: _id, criadoEm: _criadoEm, ...mutaveis } = data;
    void _id;
    void _criadoEm;
    await this.prisma.reserva.upsert({
      where: { idReserva: data.idReserva },
      create: data,
      update: mutaveis,
    });
  }
}
