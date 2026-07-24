import type { PrismaClient } from '@prisma/client';
import { StatusRecurso } from '@shared/domain/status-recurso.js';
import type { VerificadorNivelAcesso } from '../../domain/gateways/verificador-nivel-acesso.js';

/**
 * Adaptador da porta anticorrupção: consulta o banco diretamente (sem importar
 * internals do contexto de estabelecimentos) para validar que o nível existe,
 * está ativo e pertence ao estabelecimento.
 */
export class PrismaVerificadorNivelAcesso implements VerificadorNivelAcesso {
  constructor(private readonly prisma: PrismaClient) {}

  async pertenceAoEstabelecimento(nivelAcessoId: string, estabelecimentoId: string): Promise<boolean> {
    const nivel = await this.prisma.nivelAcesso.findFirst({
      where: {
        idNivelAcesso: nivelAcessoId,
        estabelecimentoId,
        status: StatusRecurso.ATIVO,
      },
      select: { idNivelAcesso: true },
    });
    return nivel !== null;
  }
}
