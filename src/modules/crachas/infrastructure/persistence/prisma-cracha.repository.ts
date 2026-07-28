import type { Prisma, PrismaClient } from '@prisma/client';
import type { Cracha } from '../../domain/entities/cracha.js';
import type {
  CrachaRepository,
  CriterioListagemCracha,
} from '../../domain/repositories/cracha.repository.js';
import { CrachaMapper } from './cracha.mapper.js';

export class PrismaCrachaRepository implements CrachaRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private montarWhere(termo?: string): Prisma.CrachaWhereInput {
    const limpo = termo?.trim();
    if (!limpo) {
      return {};
    }
    return {
      OR: [
        { codigo: { contains: limpo, mode: 'insensitive' } },
        { nome: { contains: limpo, mode: 'insensitive' } },
      ],
    };
  }

  async buscarPorId(idCracha: string): Promise<Cracha | null> {
    const row = await this.prisma.cracha.findUnique({ where: { idCracha } });
    return row ? CrachaMapper.paraDominio(row) : null;
  }

  async buscarPorCodigo(codigo: string): Promise<Cracha | null> {
    const row = await this.prisma.cracha.findUnique({ where: { codigo } });
    return row ? CrachaMapper.paraDominio(row) : null;
  }

  async listar(criterio: CriterioListagemCracha): Promise<Cracha[]> {
    const rows = await this.prisma.cracha.findMany({
      where: this.montarWhere(criterio.termo),
      orderBy: { codigo: 'asc' },
      skip: criterio.startIndex,
      take: criterio.maxRows,
    });
    return rows.map(CrachaMapper.paraDominio);
  }

  async contar(termo?: string): Promise<number> {
    return this.prisma.cracha.count({ where: this.montarWhere(termo) });
  }

  async salvar(cracha: Cracha): Promise<void> {
    const data = CrachaMapper.paraPersistencia(cracha);
    await this.prisma.cracha.upsert({
      where: { idCracha: data.idCracha },
      create: data,
      update: {
        codigo: data.codigo,
        nome: data.nome,
        status: data.status,
        atualizadoEm: data.atualizadoEm,
      },
    });
  }

  async excluir(idCracha: string): Promise<void> {
    // Cascade remove as digitais (CrachaBiometria) associadas.
    await this.prisma.cracha.delete({ where: { idCracha } });
  }
}
