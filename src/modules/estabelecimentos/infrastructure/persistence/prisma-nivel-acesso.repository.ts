import type { PrismaClient, NivelAcesso as NivelAcessoRow } from '@prisma/client';
import { NivelAcesso } from '../../domain/entities/nivel-acesso.js';
import type { NivelAcessoRepository } from '../../domain/repositories/nivel-acesso.repository.js';

type RowComPermissoes = NivelAcessoRow & { permissoes: { permissaoId: string }[] };

function paraDominio(row: RowComPermissoes): NivelAcesso {
  return NivelAcesso.restaurar({
    idNivelAcesso: row.idNivelAcesso,
    nome: row.nome,
    descricao: row.descricao,
    status: row.status,
    estabelecimentoId: row.estabelecimentoId,
    permissaoIds: new Set(row.permissoes.map((p) => p.permissaoId)),
    criadoEm: row.criadoEm,
    atualizadoEm: row.atualizadoEm,
  });
}

/**
 * Adaptador Prisma do NivelAcesso. A junção N:N com Permissao é detalhe daqui:
 * `salvar` sincroniza o Set de permissaoIds com a tabela de junção numa
 * transação (apaga e recria a seleção — semântica de "definir a seleção").
 */
export class PrismaNivelAcessoRepository implements NivelAcessoRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async buscarPorId(id: string): Promise<NivelAcesso | null> {
    const row = await this.prisma.nivelAcesso.findUnique({
      where: { idNivelAcesso: id },
      include: { permissoes: { select: { permissaoId: true } } },
    });
    return row ? paraDominio(row) : null;
  }

  async buscarPorNome(estabelecimentoId: string, nome: string): Promise<NivelAcesso | null> {
    const row = await this.prisma.nivelAcesso.findUnique({
      where: { estabelecimentoId_nome: { estabelecimentoId, nome } },
      include: { permissoes: { select: { permissaoId: true } } },
    });
    return row ? paraDominio(row) : null;
  }

  async listarPorEstabelecimento(estabelecimentoId: string): Promise<NivelAcesso[]> {
    const rows = await this.prisma.nivelAcesso.findMany({
      where: { estabelecimentoId },
      include: { permissoes: { select: { permissaoId: true } } },
      orderBy: { nome: 'asc' },
    });
    return rows.map(paraDominio);
  }

  async salvar(nivel: NivelAcesso): Promise<void> {
    const permissaoIds = [...nivel.permissaoIds];
    await this.prisma.$transaction([
      this.prisma.nivelAcesso.upsert({
        where: { idNivelAcesso: nivel.idNivelAcesso },
        create: {
          idNivelAcesso: nivel.idNivelAcesso,
          nome: nivel.nome,
          descricao: nivel.descricao,
          status: nivel.status,
          estabelecimentoId: nivel.estabelecimentoId,
          criadoEm: nivel.criadoEm,
          atualizadoEm: nivel.atualizadoEm,
        },
        update: {
          nome: nivel.nome,
          descricao: nivel.descricao,
          status: nivel.status,
          atualizadoEm: nivel.atualizadoEm,
        },
      }),
      this.prisma.nivelAcessoPermissao.deleteMany({
        where: { nivelAcessoId: nivel.idNivelAcesso },
      }),
      this.prisma.nivelAcessoPermissao.createMany({
        data: permissaoIds.map((permissaoId) => ({
          nivelAcessoId: nivel.idNivelAcesso,
          permissaoId,
        })),
      }),
    ]);
  }
}
