import type { PrismaClient } from '@prisma/client';
import { CentroTrabalhoOnline, type StatusCentroTrabalhoOnline } from '../../domain/entities/centro-trabalho-online.js';
import type { CentroTrabalhoOnlineRepository, CriterioListagemCentrosTrabalhoOnline } from '../../domain/repositories/centro-trabalho-online.repository.js';

export const CentroTrabalhoOnlineMapper = {
  paraDominio(row: {
    idCentroTrabalhoOnline: string;
    centroTrabalhoId: string;
    calculoIndicadoresId: string | null;
    status: StatusCentroTrabalhoOnline;
    movimentoAbertoId: string | null;
    ordemProducaoId: string | null;
    ultimaAtualizacao: Date;
  }): CentroTrabalhoOnline {
    return CentroTrabalhoOnline.restaurar({
      idCentroTrabalhoOnline: row.idCentroTrabalhoOnline,
      centroTrabalhoId: row.centroTrabalhoId,
      calculoIndicadoresId: row.calculoIndicadoresId,
      status: row.status,
      movimentoAbertoId: row.movimentoAbertoId,
      ordemProducaoId: row.ordemProducaoId,
      ultimaAtualizacao: row.ultimaAtualizacao,
    });
  },
};

export class PrismaCentroTrabalhoOnlineRepository implements CentroTrabalhoOnlineRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async buscarPorCentroTrabalho(centroTrabalhoId: string): Promise<CentroTrabalhoOnline | null> {
    const row = await this.prisma.centroTrabalhoOnline.findUnique({
      where: { centroTrabalhoId },
    });
    return row ? CentroTrabalhoOnlineMapper.paraDominio(row) : null;
  }

  async listar(criterio: CriterioListagemCentrosTrabalhoOnline): Promise<ReadonlyArray<CentroTrabalhoOnline>> {
    const rows = await this.prisma.centroTrabalhoOnline.findMany({
      where: {
        centroTrabalho: {
          estabelecimentoId: criterio.estabelecimentoId,
          ...(criterio.grupoMaquinaId ? { grupoMaquinaId: criterio.grupoMaquinaId } : {}),
        },
        ...(criterio.status ? { status: criterio.status } : {}),
      },
    });
    return rows.map((r) => CentroTrabalhoOnlineMapper.paraDominio(r));
  }

  async salvar(snapshot: CentroTrabalhoOnline): Promise<void> {
    const data = {
      idCentroTrabalhoOnline: snapshot.idCentroTrabalhoOnline,
      centroTrabalhoId: snapshot.centroTrabalhoId,
      calculoIndicadoresId: snapshot.calculoIndicadoresId,
      status: snapshot.status,
      movimentoAbertoId: snapshot.movimentoAbertoId,
      ordemProducaoId: snapshot.ordemProducaoId,
      ultimaAtualizacao: snapshot.ultimaAtualizacao,
    };
    const { idCentroTrabalhoOnline: _id, ...mutaveis } = data;
    void _id;
    await this.prisma.centroTrabalhoOnline.upsert({
      where: { centroTrabalhoId: snapshot.centroTrabalhoId },
      create: data,
      update: mutaveis,
    });
  }
}