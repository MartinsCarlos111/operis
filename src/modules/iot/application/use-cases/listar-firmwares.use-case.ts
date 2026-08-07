import type { FirmwareRepository } from '../../domain/repositories/firmware.repository.js';
import { paraFirmwareIotDTO, type FirmwareIotDTO } from '../dtos/firmware-iot.dto.js';

export interface ListarFirmwaresInput {
  modelo: number;
  estabelecimentoId: string;
}

/** Histórico de versões de firmware de um modelo, mais recente primeiro. */
export class ListarFirmwaresUseCase {
  constructor(private readonly firmwares: FirmwareRepository) {}

  async executar(input: ListarFirmwaresInput): Promise<FirmwareIotDTO[]> {
    const itens = await this.firmwares.listarPorModelo(input.modelo, input.estabelecimentoId);
    return itens.map(paraFirmwareIotDTO);
  }
}
