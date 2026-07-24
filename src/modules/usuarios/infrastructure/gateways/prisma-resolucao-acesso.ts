import type { PrismaClient } from '@prisma/client';
import { StatusRecurso } from '@shared/domain/status-recurso.js';
import type { AcessoResolvido, ResolucaoAcesso } from '../../domain/gateways/resolucao-acesso.js';

/**
 * A consulta de autorização em runtime: (usuarioId + estabelecimentoId) →
 * vínculo ATIVO → nível ATIVO → chaves de permissão achatadas. Uma query com
 * joins, executada a cada request — o preço da revogação imediata e do
 * isolamento entre tenants (decisão registrada na memória do projeto).
 */
export class PrismaResolucaoAcesso implements ResolucaoAcesso {
  constructor(private readonly prisma: PrismaClient) {}

  async resolver(usuarioId: string, estabelecimentoId: string): Promise<AcessoResolvido | null> {
    const vinculo = await this.prisma.usuarioEstabelecimento.findUnique({
      where: {
        usuarioId_estabelecimentoId: { usuarioId, estabelecimentoId },
        status: StatusRecurso.ATIVO,
        usuario: { status: StatusRecurso.ATIVO },
        nivelAcesso: { status: StatusRecurso.ATIVO },
      },
      include: {
        nivelAcesso: {
          include: {
            permissoes: {
              select: { permissao: { select: { chave: true } } },
            },
          },
        },
      },
    });

    if (!vinculo) return null;

    return {
      nivelAcessoId: vinculo.nivelAcesso.idNivelAcesso,
      nivelNome: vinculo.nivelAcesso.nome,
      permissoes: vinculo.nivelAcesso.permissoes.map((p) => p.permissao.chave),
    };
  }
}
