import type { PrismaClient } from '@prisma/client';
import type { LeituraChaoDeFabrica } from '../../domain/repositories/centro-trabalho-online.repository.js';

/**
 * Adaptador Prisma que satisfaz `LeituraChaoDeFabrica` consultando as tabelas
 * `movimento`, `ordemProducao` e `calculoIndicadores` — fronteira que mantém
 * o módulo monitor desacoplado do módulo manufatura.
 */
export class PrismaLeituraChaoDeFabrica implements LeituraChaoDeFabrica {
  constructor(private readonly prisma: PrismaClient) {}

  async listarMovimentosAbertos(centroTrabalhoId: string) {
    const rows = await this.prisma.movimento.findMany({
      where: { centroTrabalhoId, fim: null, cancelado: false },
      orderBy: { inicio: 'desc' },
      take: 5,
    });
    return rows.map((r) => ({ movimentoId: r.idMovimento, tipo: r.tipo, inicio: r.inicio }));
  }

  async listarOrdensEmCurso(centroTrabalhoId: string) {
    const rows = await this.prisma.ordemProducao.findMany({
      where: {
        centroTrabalhoId,
        status: { in: ['INICIADA', 'LIBERADA', 'CONGELADA'] },
      },
      take: 1,
    });
    return rows.map((r) => ({ ordemProducaoId: r.idOrdemProducao, codigo: r.codigo }));
  }

  async buscarIndicadorAtual(centroTrabalhoId: string): Promise<string | null> {
    // Indicador mais recente do dia do turno corrente — paridade com a
    // referência `CentroTrabalhoOnline.IdIndicador`.
    const row = await this.prisma.calculoIndicadores.findFirst({
      where: { centroTrabalhoId, turnoId: { not: null } },
      orderBy: { diaTurno: 'desc' },
    });
    return row?.idCalculoIndicadores ?? null;
  }
}