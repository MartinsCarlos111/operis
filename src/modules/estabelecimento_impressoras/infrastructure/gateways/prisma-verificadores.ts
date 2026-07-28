import type { PrismaClient } from '@prisma/client';
import type {
  VerificadorEstabelecimento,
  VerificadorImpressora,
} from '../../domain/gateways/verificadores.js';

/** Adaptadores anticorrupção: consultam as tabelas diretamente, sem importar
 * internals dos módulos de estabelecimentos/impressoras. */

export class PrismaVerificadorEstabelecimento implements VerificadorEstabelecimento {
  constructor(private readonly prisma: PrismaClient) {}

  async existe(estabelecimentoId: string): Promise<boolean> {
    const row = await this.prisma.estabelecimento.findUnique({
      where: { idEstabelecimento: estabelecimentoId },
      select: { idEstabelecimento: true },
    });
    return row !== null;
  }
}

export class PrismaVerificadorImpressora implements VerificadorImpressora {
  constructor(private readonly prisma: PrismaClient) {}

  async existe(impressoraId: string): Promise<boolean> {
    const row = await this.prisma.impressora.findUnique({
      where: { idImpressora: impressoraId },
      select: { idImpressora: true },
    });
    return row !== null;
  }
}
