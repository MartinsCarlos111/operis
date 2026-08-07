import { FirmwareIot } from '../../domain/entities/firmware-iot.js';
import type { FirmwareRepository } from '../../domain/repositories/firmware.repository.js';
import type { ArmazenamentoFirmwareIot } from '../../domain/gateways/armazenamento-firmware-iot.js';
import type { GeradorId } from '@shared/domain/gerador-id.js';
import { VersaoFirmwareJaExisteError } from '../../domain/exceptions/index.js';
import { paraFirmwareIotDTO, type FirmwareIotDTO } from '../dtos/firmware-iot.dto.js';

export interface EnviarFirmwareInput {
  tenantId: string;
  estabelecimentoId: string;
  modelo: number;
  versao: string;
  conteudo: Buffer;
}

/**
 * Recebe o upload do binário (paridade com
 * `CentroTrabalhoIOTController.UpdateFirmware`, mas versionado — cada envio
 * cria um `FirmwareIot` novo em vez de sobrescrever o único arquivo do
 * modelo). Envia ao object storage do tenant antes de persistir os metadados
 * — se o storage falhar, nada fica gravado pela metade.
 */
export class EnviarFirmwareUseCase {
  constructor(
    private readonly firmwares: FirmwareRepository,
    private readonly armazenamento: ArmazenamentoFirmwareIot,
    private readonly ids: GeradorId,
  ) {}

  async executar(input: EnviarFirmwareInput): Promise<FirmwareIotDTO> {
    const existente = await this.firmwares.buscarPorVersao(
      input.modelo,
      input.versao,
      input.estabelecimentoId,
    );
    if (existente) {
      throw new VersaoFirmwareJaExisteError(input.modelo, input.versao);
    }

    const idFirmwareIot = this.ids.gerar();
    const chaveObjeto = `firmware/${input.estabelecimentoId}/${input.modelo}/${input.versao}.bin`;

    await this.armazenamento.enviar(input.tenantId, chaveObjeto, input.conteudo);

    const firmware = FirmwareIot.criar({
      idFirmwareIot,
      modelo: input.modelo,
      versao: input.versao,
      chaveObjeto,
      tamanhoBytes: input.conteudo.length,
      estabelecimentoId: input.estabelecimentoId,
    });

    await this.firmwares.salvar(firmware);
    return paraFirmwareIotDTO(firmware);
  }
}
