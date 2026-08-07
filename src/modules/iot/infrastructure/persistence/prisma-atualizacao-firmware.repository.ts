import type { PrismaClient } from '@prisma/client';
import { AtualizacaoFirmwareIot, StatusAtualizacaoFirmware } from '../../domain/entities/atualizacao-firmware-iot.js';
import type { AtualizacaoFirmwareRepository } from '../../domain/repositories/atualizacao-firmware.repository.js';

const StatusEmCurso = [
  StatusAtualizacaoFirmware.SOLICITADA,
  StatusAtualizacaoFirmware.INICIADA,
] as const;

/**
 * Implementação Prisma do `AtualizacaoFirmwareRepository`. Mantém a unicidade
 * do "em curso": no tenant, só pode haver uma atualização SOLICITADA/INICIADA
 * por dispositivo — uma constraint parcial UNIQUE no Postgres reforça isso
 * (ver migration `add_uniq_em_curso_por_dispositivo`).
 */
export class PrismaAtualizacaoFirmwareRepository implements AtualizacaoFirmwareRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async buscarPorId(id: string): Promise<AtualizacaoFirmwareIot | null> {
    const row = await this.prisma.atualizacaoFirmwareIot.findUnique({ where: { idAtualizacaoFirmware: id } });
    return row ? this.paraDominio(row) : null;
  }

  async buscarEmCourse(dispositivoId: string): Promise<AtualizacaoFirmwareIot | null> {
    const row = await this.prisma.atualizacaoFirmwareIot.findFirst({
      where: { dispositivoId, status: { in: [...StatusEmCurso] } },
      orderBy: { solicitadoEm: 'desc' },
    });
    return row ? this.paraDominio(row) : null;
  }

  async listarPorDispositivo(dispositivoId: string): Promise<AtualizacaoFirmwareIot[]> {
    const rows = await this.prisma.atualizacaoFirmwareIot.findMany({
      where: { dispositivoId },
      orderBy: { solicitadoEm: 'desc' },
    });
    return rows.map((row) => this.paraDominio(row));
  }

  async salvar(a: AtualizacaoFirmwareIot): Promise<void> {
    const data = {
      idAtualizacaoFirmware: a.idAtualizacaoFirmware,
      dispositivoId: a.dispositivoId,
      firmwareId: a.firmwareId,
      versaoTarget: a.versaoTarget,
      status: a.status,
      solicitadoEm: a.solicitadoEm,
      iniciadoEm: a.iniciadoEm,
      concluidoEm: a.concluidoEm,
      mensagemErro: a.mensagemErro,
    };
    const { idAtualizacaoFirmware: _id, ...mutaveis } = data;
    void _id;
    await this.prisma.atualizacaoFirmwareIot.upsert({
      where: { idAtualizacaoFirmware: data.idAtualizacaoFirmware },
      create: data,
      update: mutaveis,
    });
  }

  private paraDominio(row: {
    idAtualizacaoFirmware: string;
    dispositivoId: string;
    firmwareId: string;
    versaoTarget: string;
    status: StatusAtualizacaoFirmware;
    solicitadoEm: Date;
    iniciadoEm: Date | null;
    concluidoEm: Date | null;
    mensagemErro: string | null;
  }): AtualizacaoFirmwareIot {
    return AtualizacaoFirmwareIot.restaurar({
      idAtualizacaoFirmware: row.idAtualizacaoFirmware,
      dispositivoId: row.dispositivoId,
      firmwareId: row.firmwareId,
      versaoTarget: row.versaoTarget,
      status: row.status,
      solicitadoEm: row.solicitadoEm,
      iniciadoEm: row.iniciadoEm,
      concluidoEm: row.concluidoEm,
      mensagemErro: row.mensagemErro,
    });
  }
}