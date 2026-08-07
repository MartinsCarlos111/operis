import type { PrismaClient } from '@prisma/client';
import { LeituraIot } from '../../domain/entities/leitura-iot.js';
import type {
  ContagemPorEntrada,
  CriterioLeiturasIot,
  EstadoPorEntrada,
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

  /**
   * Sem SUM/groupBy: precisa da sequência ordenada para contar transições
   * (mudança de valor entre leituras consecutivas). O volume por porta única
   * é limitado (1 leitura a cada report do coletor, tipicamente 30s).
   */
  async estadoDaEntrada(
    criterio: CriterioLeiturasIot & { input: number },
  ): Promise<EstadoPorEntrada> {
    const rows = await this.prisma.leituraIot.findMany({
      where: {
        dispositivoId: criterio.dispositivoId,
        input: criterio.input,
        ocorridoEm: { gte: criterio.de, lte: criterio.ate },
      },
      orderBy: { ocorridoEm: 'asc' },
      select: { valor: true, ocorridoEm: true },
    });

    if (rows.length === 0) {
      return {
        input: criterio.input,
        valorAtual: null,
        transicoes: 0,
        ocorrencias: 0,
        ultimaLeituraEm: null,
      };
    }

    let transicoes = 0;
    for (let i = 1; i < rows.length; i++) {
      if (Number(rows[i]!.valor) !== Number(rows[i - 1]!.valor)) transicoes++;
    }

    const ultima = rows[rows.length - 1]!;
    return {
      input: criterio.input,
      valorAtual: Number(ultima.valor),
      transicoes,
      ocorrencias: rows.length,
      ultimaLeituraEm: ultima.ocorridoEm,
    };
  }
}
