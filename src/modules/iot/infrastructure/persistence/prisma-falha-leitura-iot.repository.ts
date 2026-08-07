import type { PrismaClient } from '@prisma/client';
import { FalhaLeituraIot } from '../../domain/entities/falha-leitura-iot.js';
import type {
  CriterioFalhasIot,
  FalhaLeituraIotRepository,
} from '../../domain/repositories/falha-leitura-iot.repository.js';
import type { MotivoFalhaLeitura } from '../../domain/entities/falha-leitura-iot.js';

export class PrismaFalhaLeituraIotRepository implements FalhaLeituraIotRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async salvarLote(falhas: FalhaLeituraIot[]): Promise<number> {
    const resultado = await this.prisma.falhaLeituraIot.createMany({
      data: falhas.map((f) => ({
        idFalhaLeituraIot: f.idFalhaLeituraIot,
        dispositivoId: f.dispositivoId,
        serial: f.serial,
        input: f.input,
        motivo: f.motivo,
        ocorridoEm: f.ocorridoEm,
        registradoEm: f.registradoEm,
        chaveEvento: f.chaveEvento,
      })),
      skipDuplicates: true,
    });
    return resultado.count;
  }

  async listar(criterio: CriterioFalhasIot): Promise<FalhaLeituraIot[]> {
    const rows = await this.prisma.falhaLeituraIot.findMany({
      where: {
        serial: criterio.serial,
        ocorridoEm: { gte: criterio.de, lte: criterio.ate },
      },
      orderBy: { ocorridoEm: 'desc' },
    });
    return rows.map((row) =>
      FalhaLeituraIot.restaurar({
        idFalhaLeituraIot: row.idFalhaLeituraIot,
        dispositivoId: row.dispositivoId,
        serial: row.serial,
        input: row.input,
        motivo: row.motivo as MotivoFalhaLeitura,
        ocorridoEm: row.ocorridoEm,
        registradoEm: row.registradoEm,
        chaveEvento: row.chaveEvento,
      }),
    );
  }

  async contar(criterio: CriterioFalhasIot): Promise<number> {
    return this.prisma.falhaLeituraIot.count({
      where: {
        serial: criterio.serial,
        ocorridoEm: { gte: criterio.de, lte: criterio.ate },
      },
    });
  }
}
