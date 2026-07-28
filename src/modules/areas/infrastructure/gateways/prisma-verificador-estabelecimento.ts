import type { PrismaClient } from '@prisma/client';
import { StatusRecurso } from '@shared/domain/status-recurso.js';
import type { VerificadorEstabelecimento } from '../../domain/gateways/verificador-estabelecimento.js';

/**
 * Adaptador da porta anticorrupção: consulta a tabela de estabelecimentos
 * diretamente (sem importar internals daquele módulo) para as regras do AreaRN.
 */
export class PrismaVerificadorEstabelecimento implements VerificadorEstabelecimento {
  constructor(private readonly prisma: PrismaClient) {}

  async existe(estabelecimentoId: string): Promise<boolean> {
    const row = await this.prisma.estabelecimento.findUnique({
      where: { idEstabelecimento: estabelecimentoId },
      select: { idEstabelecimento: true },
    });
    return row !== null;
  }

  async estaAtivo(estabelecimentoId: string): Promise<boolean> {
    const row = await this.prisma.estabelecimento.findFirst({
      where: { idEstabelecimento: estabelecimentoId, status: StatusRecurso.ATIVO },
      select: { idEstabelecimento: true },
    });
    return row !== null;
  }
}
