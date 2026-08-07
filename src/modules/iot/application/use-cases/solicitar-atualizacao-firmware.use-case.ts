import { AtualizacaoFirmwareIot } from '../../domain/entities/atualizacao-firmware-iot.js';
import type { AtualizacaoFirmwareRepository } from '../../domain/repositories/atualizacao-firmware.repository.js';
import type { DispositivoIotRepository } from '../../domain/repositories/dispositivo-iot.repository.js';
import type { FirmwareRepository } from '../../domain/repositories/firmware.repository.js';
import type { PublicadorAtualizacaoFirmwareIot } from '../../domain/gateways/publicador-atualizacao-firmware-iot.js';
import type { GeradorId } from '@shared/domain/gerador-id.js';
import {
  AtualizacaoFirmwareEmCursoError,
  DispositivoIotNaoEncontradoError,
  FirmwareNaoEncontradoError,
} from '../../domain/exceptions/index.js';
import {
  paraAtualizacaoFirmwareIotDTO,
  type AtualizacaoFirmwareIotDTO,
} from '../dtos/firmware-iot.dto.js';

export interface SolicitarAtualizacaoFirmwareInput {
  tenantId: string;
  estabelecimentoId: string;
  dispositivoId: string;
  firmwareId: string;
}

/**
 * Dispara a atualização OTA de um dispositivo (paridade com
 * `CentroTrabalhoIOTController.UpdateFirmware`): valida que não há ciclo em
 * curso, cria o registro `AtualizacaoFirmwareIot` (SOLICITADA) e publica
 * `{type: UPDATE}` na routing key do dispositivo — o coletor baixa o binário
 * sozinho via a URL de download pública, montada a partir do `firmwareId`.
 */
export class SolicitarAtualizacaoFirmwareUseCase {
  constructor(
    private readonly atualizacoes: AtualizacaoFirmwareRepository,
    private readonly dispositivos: DispositivoIotRepository,
    private readonly firmwares: FirmwareRepository,
    private readonly publicador: PublicadorAtualizacaoFirmwareIot,
    private readonly ids: GeradorId,
    /** Monta a URL pública de download — decisão do composition root HTTP. */
    private readonly montarUrlDownload: (tenantId: string, firmwareId: string) => string,
  ) {}

  async executar(input: SolicitarAtualizacaoFirmwareInput): Promise<AtualizacaoFirmwareIotDTO> {
    const dispositivo = await this.dispositivos.buscarPorId(
      input.dispositivoId,
      input.estabelecimentoId,
    );
    if (!dispositivo) {
      throw new DispositivoIotNaoEncontradoError(input.dispositivoId);
    }

    const firmware = await this.firmwares.buscarPorId(input.firmwareId, input.estabelecimentoId);
    if (!firmware) {
      throw new FirmwareNaoEncontradoError(input.firmwareId);
    }

    const emCurso = await this.atualizacoes.buscarEmCourse(input.dispositivoId);
    if (emCurso) {
      throw new AtualizacaoFirmwareEmCursoError(input.dispositivoId);
    }

    const atualizacao = AtualizacaoFirmwareIot.criar({
      idAtualizacaoFirmware: this.ids.gerar(),
      dispositivoId: dispositivo.idDispositivoIot,
      firmwareId: firmware.idFirmwareIot,
      versaoTarget: firmware.versao,
    });
    await this.atualizacoes.salvar(atualizacao);

    await this.publicador.publicarAtualizacao(
      input.tenantId,
      dispositivo.routingKey,
      this.montarUrlDownload(input.tenantId, firmware.idFirmwareIot),
    );

    return paraAtualizacaoFirmwareIotDTO(atualizacao);
  }
}
