import type { PrismaClient } from '@prisma/client';
import type { CondicaoNotificacao } from '../../domain/entities/condicao-notificacao.js';
import type { CondicaoNotificacaoRepository } from '../../domain/repositories/condicao-notificacao.repository.js';
import { CondicaoNotificacaoMapper } from './condicao-notificacao.mapper.js';

export class PrismaCondicaoNotificacaoRepository implements CondicaoNotificacaoRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async buscarPorId(idCondicaoNotificacao: string): Promise<CondicaoNotificacao | null> {
    const row = await this.prisma.condicaoNotificacao.findUnique({
      where: { idCondicaoNotificacao },
    });
    return row ? CondicaoNotificacaoMapper.paraDominio(row) : null;
  }

  async listarPorRegra(regraNotificacaoId: string): Promise<CondicaoNotificacao[]> {
    const rows = await this.prisma.condicaoNotificacao.findMany({
      where: { regraNotificacaoId },
      orderBy: { criadoEm: 'asc' },
    });
    return rows.map(CondicaoNotificacaoMapper.paraDominio);
  }

  async contarPorRegra(regraNotificacaoId: string): Promise<number> {
    return this.prisma.condicaoNotificacao.count({ where: { regraNotificacaoId } });
  }

  async salvar(condicao: CondicaoNotificacao): Promise<void> {
    const data = CondicaoNotificacaoMapper.paraPersistencia(condicao);
    await this.prisma.condicaoNotificacao.upsert({
      where: { idCondicaoNotificacao: data.idCondicaoNotificacao },
      create: data,
      update: {
        campo: data.campo,
        operador: data.operador,
        valor: data.valor,
        atualizadoEm: data.atualizadoEm,
      },
    });
  }

  async excluir(idCondicaoNotificacao: string): Promise<void> {
    await this.prisma.condicaoNotificacao.delete({ where: { idCondicaoNotificacao } });
  }
}
