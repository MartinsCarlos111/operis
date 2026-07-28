import type { Prisma, PrismaClient } from '@prisma/client';
import type { RegraNotificacao } from '../../domain/entities/regra-notificacao.js';
import type {
  RegraNotificacaoRepository,
  CriterioListagemRegra,
} from '../../domain/repositories/regra-notificacao.repository.js';
import { RegraNotificacaoMapper } from './regra-notificacao.mapper.js';

export class PrismaRegraNotificacaoRepository implements RegraNotificacaoRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private montarWhere(termo?: string): Prisma.RegraNotificacaoWhereInput {
    const limpo = termo?.trim();
    if (!limpo) {
      return {};
    }
    return {
      OR: [
        { codigo: { contains: limpo, mode: 'insensitive' } },
        { descricao: { contains: limpo, mode: 'insensitive' } },
        { tabela: { contains: limpo, mode: 'insensitive' } },
      ],
    };
  }

  async buscarPorId(idRegraNotificacao: string): Promise<RegraNotificacao | null> {
    const row = await this.prisma.regraNotificacao.findUnique({ where: { idRegraNotificacao } });
    return row ? RegraNotificacaoMapper.paraDominio(row) : null;
  }

  async buscarPorCodigo(codigo: string): Promise<RegraNotificacao | null> {
    const row = await this.prisma.regraNotificacao.findUnique({ where: { codigo } });
    return row ? RegraNotificacaoMapper.paraDominio(row) : null;
  }

  async listar(criterio: CriterioListagemRegra): Promise<RegraNotificacao[]> {
    const rows = await this.prisma.regraNotificacao.findMany({
      where: this.montarWhere(criterio.termo),
      orderBy: { codigo: 'asc' },
      skip: criterio.startIndex,
      take: criterio.maxRows,
    });
    return rows.map(RegraNotificacaoMapper.paraDominio);
  }

  async contar(termo?: string): Promise<number> {
    return this.prisma.regraNotificacao.count({ where: this.montarWhere(termo) });
  }

  async salvar(regra: RegraNotificacao): Promise<void> {
    const data = RegraNotificacaoMapper.paraPersistencia(regra);
    await this.prisma.regraNotificacao.upsert({
      where: { idRegraNotificacao: data.idRegraNotificacao },
      create: data,
      update: {
        codigo: data.codigo,
        descricao: data.descricao,
        destinatarios: data.destinatarios,
        produto: data.produto,
        tabela: data.tabela,
        conteudo: data.conteudo,
        status: data.status,
        atualizadoEm: data.atualizadoEm,
      },
    });
  }

  async excluir(idRegraNotificacao: string): Promise<void> {
    // Cascade no schema remove as condições filhas automaticamente.
    await this.prisma.regraNotificacao.delete({ where: { idRegraNotificacao } });
  }
}
