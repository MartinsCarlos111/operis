import type { PrismaClient } from '@prisma/client';
import { LeituraIot } from '../../domain/entities/leitura-iot.js';
import type {
  ContagemPorEntrada,
  CriterioLeiturasIot,
  LeituraIotRepository,
} from '../../domain/repositories/leitura-iot.repository.js';
import type { ContextoIot } from '../../domain/entities/entrada-iot.js';

export class PrismaLeituraIotRepository implements LeituraIotRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * `skipDuplicates` faz o trabalho de deduplicação via índice único em
   * chaveEvento: reentregas do MQTT são ignoradas silenciosamente, sem
   * precisar de SELECT prévio nem transação.
   */
  async salvarLote(leituras: LeituraIot[]): Promise<number> {
    const resultado = await this.prisma.leituraIot.createMany({
      data: leituras.map((l) => ({
        idLeituraIot: l.idLeituraIot,
        dispositivoId: l.dispositivoId,
        input: l.input,
        contexto: l.contexto,
        valor: l.valor,
        ocorridoEm: l.ocorridoEm,
        chaveEvento: l.chaveEvento,
      })),
      skipDuplicates: true,
    });
    return resultado.count;
  }

  async listar(criterio: CriterioLeiturasIot): Promise<LeituraIot[]> {
    const rows = await this.prisma.leituraIot.findMany({
      where: {
        dispositivoId: criterio.dispositivoId,
        ocorridoEm: { gte: criterio.de, lte: criterio.ate },
        ...(criterio.input !== undefined ? { input: criterio.input } : {}),
      },
      orderBy: { ocorridoEm: 'desc' },
    });
    return rows.map((row) =>
      LeituraIot.restaurar({
        idLeituraIot: row.idLeituraIot,
        dispositivoId: row.dispositivoId,
        input: row.input,
        contexto: row.contexto,
        valor: Number(row.valor),
        ocorridoEm: row.ocorridoEm,
        chaveEvento: row.chaveEvento,
      }),
    );
  }

  /**
   * Agregação no banco (não em memória): o volume de leituras cresce sem
   * limite, e trazer tudo para somar em JS não escala.
   */
  async contarPorEntrada(criterio: CriterioLeiturasIot): Promise<ContagemPorEntrada[]> {
    const grupos = await this.prisma.leituraIot.groupBy({
      by: ['input', 'contexto'],
      where: {
        dispositivoId: criterio.dispositivoId,
        ocorridoEm: { gte: criterio.de, lte: criterio.ate },
        ...(criterio.input !== undefined ? { input: criterio.input } : {}),
      },
      _sum: { valor: true },
      _count: { _all: true },
      _max: { ocorridoEm: true },
    });

    return grupos.map((g) => ({
      input: g.input,
      contexto: g.contexto as ContextoIot,
      total: g._sum.valor === null ? 0 : Number(g._sum.valor),
      ocorrencias: g._count._all,
      ultimaLeituraEm: g._max.ocorridoEm ?? null,
    }));
  }
}
