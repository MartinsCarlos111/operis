import type { FirmwareRepository } from '../../domain/repositories/firmware.repository.js';
import type { ArmazenamentoFirmwareIot } from '../../domain/gateways/armazenamento-firmware-iot.js';
import { FirmwareNaoEncontradoError } from '../../domain/exceptions/index.js';

export interface BaixarFirmwareInput {
  tenantId: string;
  firmwareId: string;
}

/**
 * Serve o binário para o coletor baixar (rota pública, sem autenticação —
 * paridade com `CentroTrabalhoIOTController.DownloadFirmware [AllowAnonymous]`).
 * O firmware físico não tem credenciais; é por isso que só o `tenantId` +
 * `firmwareId` na própria URL identificam o recurso, sem escopo de estabelecimento.
 */
export class BaixarFirmwareUseCase {
  constructor(
    private readonly firmwares: FirmwareRepository,
    private readonly armazenamento: ArmazenamentoFirmwareIot,
  ) {}

  async executar(input: BaixarFirmwareInput): Promise<Buffer> {
    const firmware = await this.firmwares.buscarPorIdSemEscopo(input.firmwareId);
    if (!firmware) {
      throw new FirmwareNaoEncontradoError(input.firmwareId);
    }
    return this.armazenamento.baixar(input.tenantId, firmware.chaveObjeto);
  }
}
