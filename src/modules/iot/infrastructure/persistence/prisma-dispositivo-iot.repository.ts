import type { Prisma, PrismaClient } from '@prisma/client';
import type { DispositivoIot } from '../../domain/entities/dispositivo-iot.js';
import type {
  CriterioListagemDispositivoIot,
  DispositivoIotRepository,
} from '../../domain/repositories/dispositivo-iot.repository.js';
import { DispositivoIotMapper } from './dispositivo-iot.mapper.js';

export class PrismaDispositivoIotRepository implements DispositivoIotRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /** Busca textual sobre serial/nome/centro de trabalho, escopada ao estabelecimento. */
  private montarWhere(estabelecimentoId: string, termo?: string): Prisma.DispositivoIotWhereInput {
    const where: Prisma.DispositivoIotWhereInput = { estabelecimentoId };
    const limpo = termo?.trim();
    if (limpo) {
      where.OR = [
        { serial: { contains: limpo, mode: 'insensitive' } },
        { nome: { contains: limpo, mode: 'insensitive' } },
        { centroTrabalho: { contains: limpo, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  async buscarPorId(
    idDispositivoIot: string,
    estabelecimentoId: string,
  ): Promise<DispositivoIot | null> {
    const row = await this.prisma.dispositivoIot.findFirst({
      where: { idDispositivoIot, estabelecimentoId },
      include: { entradas: { orderBy: [{ tipo: 'asc' }, { input: 'asc' }] } },
    });
    return row ? DispositivoIotMapper.paraDominio(row) : null;
  }

  /**
   * Sem escopo de estabelecimento de propósito: o serial é único no tenant
   * inteiro (é o client_id no broker), então a checagem de unicidade tem de
   * enxergar todos os estabelecimentos.
   */
  async buscarPorSerial(serial: string): Promise<DispositivoIot | null> {
    const row = await this.prisma.dispositivoIot.findUnique({
      where: { serial },
      include: { entradas: true },
    });
    return row ? DispositivoIotMapper.paraDominio(row) : null;
  }

  async listar(criterio: CriterioListagemDispositivoIot): Promise<DispositivoIot[]> {
    const rows = await this.prisma.dispositivoIot.findMany({
      where: this.montarWhere(criterio.estabelecimentoId, criterio.termo),
      include: { entradas: { orderBy: [{ tipo: 'asc' }, { input: 'asc' }] } },
      orderBy: { nome: 'asc' },
      skip: criterio.startIndex,
      take: criterio.maxRows,
    });
    return rows.map((row) => DispositivoIotMapper.paraDominio(row));
  }

  async contar(estabelecimentoId: string, termo?: string): Promise<number> {
    return this.prisma.dispositivoIot.count({
      where: this.montarWhere(estabelecimentoId, termo),
    });
  }

  /**
   * Grava o agregado inteiro. As entradas são substituídas (deleteMany +
   * createMany) dentro da mesma transação: é assim que a tela edita a
   * configuração — como um bloco, não item a item.
   */
  async salvar(dispositivo: DispositivoIot): Promise<void> {
    const dados = {
      serial: dispositivo.serial,
      nome: dispositivo.nome,
      modelo: dispositivo.modelo,
      versaoFirmware: dispositivo.versaoFirmware,
      ip: dispositivo.ip,
      centroTrabalho: dispositivo.centroTrabalho,
      estabelecimentoId: dispositivo.estabelecimentoId,
      criadoEm: dispositivo.criadoEm,
      atualizadoEm: dispositivo.atualizadoEm,
    };

    await this.prisma.$transaction(async (tx) => {
      await tx.dispositivoIot.upsert({
        where: { idDispositivoIot: dispositivo.idDispositivoIot },
        create: { idDispositivoIot: dispositivo.idDispositivoIot, ...dados },
        update: dados,
      });

      await tx.entradaIot.deleteMany({ where: { dispositivoId: dispositivo.idDispositivoIot } });

      if (dispositivo.entradas.length > 0) {
        await tx.entradaIot.createMany({
          data: dispositivo.entradas.map((e) => ({
            idEntradaIot: e.idEntradaIot,
            dispositivoId: dispositivo.idDispositivoIot,
            input: e.input,
            label: e.label,
            tipo: e.tipo,
            contexto: e.contexto,
            funcao: e.funcao,
            param1: e.param1,
            param2: e.param2,
            param3: e.param3,
            param4: e.param4,
            analogicaComoDigital: e.analogicaComoDigital,
            habilitado: e.habilitado,
          })),
        });
      }
    });
  }

  async excluir(idDispositivoIot: string): Promise<void> {
    await this.prisma.dispositivoIot.delete({ where: { idDispositivoIot } });
  }
}
