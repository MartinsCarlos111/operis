import type { PrismaClient } from '@prisma/client';
import { StatusRecurso } from '@shared/domain/status-recurso.js';
import type { VerificadorEstabelecimento } from '../../domain/gateways/verificador-estabelecimento.js';

/**
 * Adaptador da porta anticorrupção: lê a tabela de estabelecimentos direto
 * (sem importar internals daquele módulo) para as regras do CentroTrabalhoRN.
 */
export class PrismaVerificadorEstabelecimento implements VerificadorEstabelecimento {
  constructor(private readonly prisma: PrismaClient) {}

  async estaAtivo(estabelecimentoId: string): Promise<boolean> {
    const row = await this.prisma.estabelecimento.findFirst({
      where: { idEstabelecimento: estabelecimentoId, status: StatusRecurso.ATIVO },
      select: { idEstabelecimento: true },
    });
    return row !== null;
  }

  async temManufatura(estabelecimentoId: string): Promise<boolean> {
    const row = await this.prisma.estabelecimento.findFirst({
      where: { idEstabelecimento: estabelecimentoId, manufatura: StatusRecurso.ATIVO },
      select: { idEstabelecimento: true },
    });
    return row !== null;
  }
}
