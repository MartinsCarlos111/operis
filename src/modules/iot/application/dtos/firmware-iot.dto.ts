import type { FirmwareIot } from '../../domain/entities/firmware-iot.js';
import type { AtualizacaoFirmwareIot } from '../../domain/entities/atualizacao-firmware-iot.js';
import type { StatusAtualizacaoFirmware } from '../../domain/entities/atualizacao-firmware-iot.js';

export interface FirmwareIotDTO {
  idFirmwareIot: string;
  modelo: number;
  versao: string;
  tamanhoBytes: number;
  criadoEm: string;
}

export function paraFirmwareIotDTO(firmware: FirmwareIot): FirmwareIotDTO {
  return {
    idFirmwareIot: firmware.idFirmwareIot,
    modelo: firmware.modelo,
    versao: firmware.versao,
    tamanhoBytes: firmware.tamanhoBytes,
    criadoEm: firmware.criadoEm.toISOString(),
  };
}

export interface AtualizacaoFirmwareIotDTO {
  idAtualizacaoFirmware: string;
  dispositivoId: string;
  firmwareId: string;
  versaoTarget: string;
  status: StatusAtualizacaoFirmware;
  solicitadoEm: string;
  iniciadoEm: string | null;
  concluidoEm: string | null;
  mensagemErro: string | null;
}

export function paraAtualizacaoFirmwareIotDTO(
  atualizacao: AtualizacaoFirmwareIot,
): AtualizacaoFirmwareIotDTO {
  return {
    idAtualizacaoFirmware: atualizacao.idAtualizacaoFirmware,
    dispositivoId: atualizacao.dispositivoId,
    firmwareId: atualizacao.firmwareId,
    versaoTarget: atualizacao.versaoTarget,
    status: atualizacao.status,
    solicitadoEm: atualizacao.solicitadoEm.toISOString(),
    iniciadoEm: atualizacao.iniciadoEm ? atualizacao.iniciadoEm.toISOString() : null,
    concluidoEm: atualizacao.concluidoEm ? atualizacao.concluidoEm.toISOString() : null,
    mensagemErro: atualizacao.mensagemErro,
  };
}
