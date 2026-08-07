import type { PrismaClient } from '@prisma/client';
import { FirmwareIot } from '../../domain/entities/firmware-iot.js';
import type { FirmwareRepository } from '../../domain/repositories/firmware.repository.js';

function paraDominio(row: {
  idFirmwareIot: string;
  modelo: number;
  versao: string;
  chaveObjeto: string;
  tamanhoBytes: number;
  estabelecimentoId: string;
  criadoEm: Date;
}): FirmwareIot {
  return FirmwareIot.restaurar(row);
}

export class PrismaFirmwareRepository implements FirmwareRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async buscarPorId(id: string, estabelecimentoId: string): Promise<FirmwareIot | null> {
    const row = await this.prisma.firmwareIot.findFirst({
      where: { idFirmwareIot: id, estabelecimentoId },
    });
    return row ? paraDominio(row) : null;
  }

  async buscarPorIdSemEscopo(id: string): Promise<FirmwareIot | null> {
    const row = await this.prisma.firmwareIot.findUnique({ where: { idFirmwareIot: id } });
    return row ? paraDominio(row) : null;
  }

  async buscarPorVersao(
    modelo: number,
    versao: string,
    estabelecimentoId: string,
  ): Promise<FirmwareIot | null> {
    const row = await this.prisma.firmwareIot.findUnique({
      where: { estabelecimentoId_modelo_versao: { estabelecimentoId, modelo, versao } },
    });
    return row ? paraDominio(row) : null;
  }

  async listarPorModelo(modelo: number, estabelecimentoId: string): Promise<FirmwareIot[]> {
    const rows = await this.prisma.firmwareIot.findMany({
      where: { modelo, estabelecimentoId },
      orderBy: { criadoEm: 'desc' },
    });
    return rows.map(paraDominio);
  }

  async salvar(firmware: FirmwareIot): Promise<void> {
    const data = {
      idFirmwareIot: firmware.idFirmwareIot,
      modelo: firmware.modelo,
      versao: firmware.versao,
      chaveObjeto: firmware.chaveObjeto,
      tamanhoBytes: firmware.tamanhoBytes,
      estabelecimentoId: firmware.estabelecimentoId,
      criadoEm: firmware.criadoEm,
    };
    // FirmwareIot é imutável — só cria, nunca atualiza (upload novo = registro novo).
    await this.prisma.firmwareIot.create({ data });
  }
}
