import type { Etiqueta as EtiquetaRow, Prisma, PrismaClient } from '@prisma/client';
import { Etiqueta, MotivoGeracaoEtiqueta, StatusEtiqueta } from '../../domain/entities/etiqueta.js';
import { Rastreabilidade } from '../../domain/entities/rastreabilidade.js';
import type {
  CriterioListagemEtiqueta,
  EtiquetaRepository,
  RastreabilidadeRepository,
} from '../../domain/repositories/etiqueta.repositories.js';

export const EtiquetaMapper = {
  paraDominio(row: EtiquetaRow): Etiqueta {
    return Etiqueta.restaurar({
      idEtiqueta: row.idEtiqueta,
      codigoBarras: row.codigoBarras,
      sequencial: row.sequencial,
      motivoGeracao: row.motivoGeracao as MotivoGeracaoEtiqueta,
      status: row.status as StatusEtiqueta,
      quantidade: row.quantidade.toNumber(),
      unidadeMedida: row.unidadeMedida,
      ordemProducaoId: row.ordemProducaoId,
      movimentoId: row.movimentoId,
      layoutId: row.layoutId,
      impressoEm: row.impressoEm,
      baixadoEm: row.baixadoEm,
      usuarioId: row.usuarioId,
      observacao: row.observacao,
      estabelecimentoId: row.estabelecimentoId,
    });
  },
};

export class PrismaEtiquetaRepository implements EtiquetaRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private where(c: CriterioListagemEtiqueta): Prisma.EtiquetaWhereInput {
    return {
      estabelecimentoId: c.estabelecimentoId,
      ...(c.ordemProducaoId ? { ordemProducaoId: c.ordemProducaoId } : {}),
      ...(c.status ? { status: c.status } : {}),
      ...(c.motivo ? { motivoGeracao: c.motivo } : {}),
    };
  }

  async buscarPorId(id: string, estabelecimentoId: string): Promise<Etiqueta | null> {
    const row = await this.prisma.etiqueta.findFirst({ where: { idEtiqueta: id, estabelecimentoId } });
    return row ? EtiquetaMapper.paraDominio(row) : null;
  }

  async buscarPorCodigo(codigoBarras: string): Promise<Etiqueta | null> {
    const row = await this.prisma.etiqueta.findUnique({ where: { codigoBarras } });
    return row ? EtiquetaMapper.paraDominio(row) : null;
  }

  async listar(criterio: CriterioListagemEtiqueta): Promise<Etiqueta[]> {
    const rows = await this.prisma.etiqueta.findMany({
      where: this.where(criterio),
      orderBy: { sequencial: 'asc' },
      skip: criterio.startIndex,
      take: criterio.maxRows,
    });
    return rows.map((r) => EtiquetaMapper.paraDominio(r));
  }

  async contar(criterio: CriterioListagemEtiqueta): Promise<number> {
    return this.prisma.etiqueta.count({ where: this.where(criterio) });
  }

  async salvar(etiqueta: Etiqueta): Promise<void> {
    const data = {
      idEtiqueta: etiqueta.idEtiqueta,
      codigoBarras: etiqueta.codigoBarras,
      sequencial: etiqueta.sequencial,
      motivoGeracao: etiqueta.motivoGeracao,
      status: etiqueta.status,
      quantidade: etiqueta.quantidade,
      unidadeMedida: etiqueta.unidadeMedida,
      ordemProducaoId: etiqueta.ordemProducaoId,
      movimentoId: etiqueta.movimentoId,
      layoutId: etiqueta.layoutId,
      impressoEm: etiqueta.impressoEm,
      baixadoEm: etiqueta.baixadoEm,
      usuarioId: etiqueta.usuarioId,
      observacao: etiqueta.observacao,
      estabelecimentoId: etiqueta.estabelecimentoId,
    };
    const { idEtiqueta: _id, ...mutaveis } = data;
    void _id;
    await this.prisma.etiqueta.upsert({
      where: { idEtiqueta: data.idEtiqueta },
      create: data,
      update: mutaveis,
    });
  }

  async proximoSequencial(ordemProducaoId: string): Promise<number> {
    const maior = await this.prisma.etiqueta.aggregate({
      where: { ordemProducaoId },
      _max: { sequencial: true },
    });
    return (maior._max.sequencial ?? 0) + 1;
  }

  async listarDisponiveisPorOrdem(ordemProducaoId: string): Promise<Etiqueta[]> {
    const rows = await this.prisma.etiqueta.findMany({
      where: { ordemProducaoId, status: 'DISPONIVEL' as StatusEtiqueta },
    });
    return rows.map((r) => EtiquetaMapper.paraDominio(r));
  }
}

export class PrismaRastreabilidadeRepository implements RastreabilidadeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async buscarPorId(id: string): Promise<Rastreabilidade | null> {
    const row = await this.prisma.rastreabilidade.findUnique({ where: { idRastreabilidade: id } });
    return row
      ? Rastreabilidade.restaurar({
          idRastreabilidade: row.idRastreabilidade,
          etiquetaId: row.etiquetaId,
          ordemProducaoId: row.ordemProducaoId,
          movimentoId: row.movimentoId,
          itemCodigo: row.itemCodigo,
          itemDescricao: row.itemDescricao,
          lote: row.lote,
          serie: row.serie,
          quantidadeProduzida: row.quantidadeProduzida.toNumber(),
          quantidadeRefugo: row.quantidadeRefugo.toNumber(),
        })
      : null;
  }

  async listarPorEtiqueta(etiquetaId: string): Promise<Rastreabilidade[]> {
    const rows = await this.prisma.rastreabilidade.findMany({ where: { etiquetaId } });
    return rows.map((r) =>
      Rastreabilidade.restaurar({
        idRastreabilidade: r.idRastreabilidade,
        etiquetaId: r.etiquetaId,
        ordemProducaoId: r.ordemProducaoId,
        movimentoId: r.movimentoId,
        itemCodigo: r.itemCodigo,
        itemDescricao: r.itemDescricao,
        lote: r.lote,
        serie: r.serie,
        quantidadeProduzida: r.quantidadeProduzida.toNumber(),
        quantidadeRefugo: r.quantidadeRefugo.toNumber(),
      }),
    );
  }

  async listarPorOrdemProducao(ordemProducaoId: string): Promise<Rastreabilidade[]> {
    const rows = await this.prisma.rastreabilidade.findMany({ where: { ordemProducaoId } });
    return rows.map((r) =>
      Rastreabilidade.restaurar({
        idRastreabilidade: r.idRastreabilidade,
        etiquetaId: r.etiquetaId,
        ordemProducaoId: r.ordemProducaoId,
        movimentoId: r.movimentoId,
        itemCodigo: r.itemCodigo,
        itemDescricao: r.itemDescricao,
        lote: r.lote,
        serie: r.serie,
        quantidadeProduzida: r.quantidadeProduzida.toNumber(),
        quantidadeRefugo: r.quantidadeRefugo.toNumber(),
      }),
    );
  }

  async salvar(r: Rastreabilidade): Promise<void> {
    const data = {
      idRastreabilidade: r.idRastreabilidade,
      etiquetaId: r.etiquetaId,
      ordemProducaoId: r.ordemProducaoId,
      movimentoId: r.movimentoId,
      itemCodigo: r.itemCodigo,
      itemDescricao: r.itemDescricao,
      lote: r.lote,
      serie: r.serie,
      quantidadeProduzida: r.quantidadeProduzida,
      quantidadeRefugo: r.quantidadeRefugo,
    };
    const { idRastreabilidade: _id, ...mutaveis } = data;
    void _id;
    await this.prisma.rastreabilidade.upsert({
      where: { idRastreabilidade: data.idRastreabilidade },
      create: data,
      update: mutaveis,
    });
  }
}