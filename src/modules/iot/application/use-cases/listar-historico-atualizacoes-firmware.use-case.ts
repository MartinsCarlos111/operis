import type { AtualizacaoFirmwareRepository } from '../../domain/repositories/atualizacao-firmware.repository.js';
import type { DispositivoIotRepository } from '../../domain/repositories/dispositivo-iot.repository.js';
import { DispositivoIotNaoEncontradoError } from '../../domain/exceptions/index.js';
import {
  paraAtualizacaoFirmwareIotDTO,
  type AtualizacaoFirmwareIotDTO,
} from '../dtos/firmware-iot.dto.js';

export interface ListarHistoricoAtualizacoesFirmwareInput {
  dispositivoId: string;
  estabelecimentoId: string;
}

/** Histórico de ciclos OTA de um dispositivo, mais recente primeiro. */
export class ListarHistoricoAtualizacoesFirmwareUseCase {
  constructor(
    private readonly atualizacoes: AtualizacaoFirmwareRepository,
    private readonly dispositivos: DispositivoIotRepository,
  ) {}

  async executar(
    input: ListarHistoricoAtualizacoesFirmwareInput,
  ): Promise<AtualizacaoFirmwareIotDTO[]> {
    const dispositivo = await this.dispositivos.buscarPorId(
      input.dispositivoId,
      input.estabelecimentoId,
    );
    if (!dispositivo) {
      throw new DispositivoIotNaoEncontradoError(input.dispositivoId);
    }

    const itens = await this.atualizacoes.listarPorDispositivo(input.dispositivoId);
    return itens.map(paraAtualizacaoFirmwareIotDTO);
  }
}
