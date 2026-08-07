import type { PrismaClient } from '@prisma/client';

/**
 * Adapter backend do `RegistrarDispositivoIotUseCase`: busca dispositivo por
 * serial e atualiza campos de compatibilidade (modelo/versaoFirmware/ip)
 * reportados no REGISTER do firmware. Mantida em infrastructure porque o
 * use-case é agnóstico ao Prisma — injeta apenas esta porta.
 */
export interface DispositivoIotCompatibilidade {
  buscarPorSerial(
    serial: string,
  ): Promise<{ idDispositivoIot: string; estabelecimentoId: string } | null>;
  salvarCompatibilidade(params: {
    idDispositivoIot: string;
    modelo?: number | undefined;
    versaoFirmware?: string | undefined;
    ip?: string | undefined;
  }): Promise<void>;
}

export class PrismaDispositivoIotCompatibilidade implements DispositivoIotCompatibilidade {
  constructor(private readonly prisma: PrismaClient) {}

  async buscarPorSerial(serial: string) {
    const row = await this.prisma.dispositivoIot.findUnique({
      where: { serial },
      select: { idDispositivoIot: true, estabelecimentoId: true },
    });
    return row;
  }

  async salvarCompatibilidade(params: {
    idDispositivoIot: string;
    modelo?: number | undefined;
    versaoFirmware?: string | undefined;
    ip?: string | undefined;
  }): Promise<void> {
    await this.prisma.dispositivoIot.update({
      where: { idDispositivoIot: params.idDispositivoIot },
      data: {
        ...(params.modelo !== undefined ? { modelo: params.modelo } : {}),
        ...(params.versaoFirmware !== undefined ? { versaoFirmware: params.versaoFirmware } : {}),
        ...(params.ip !== undefined ? { ip: params.ip } : {}),
      },
    });
  }
}