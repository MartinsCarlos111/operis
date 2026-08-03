import { DispositivoIot } from '../../domain/entities/dispositivo-iot.js';
import type { DispositivoIotRepository } from '../../domain/repositories/dispositivo-iot.repository.js';
import type { VerificadorEstabelecimento } from '../../domain/gateways/verificador-estabelecimento.js';
import type { GeradorId } from '@shared/domain/gerador-id.js';
import {
  EstabelecimentoInativoError,
  EstabelecimentoNaoEncontradoError,
  SerialIotJaExisteError,
} from '../../domain/exceptions/index.js';
import { paraDispositivoIotDTO, type DispositivoIotDTO } from '../dtos/dispositivo-iot.dto.js';

export interface CriarDispositivoIotInput {
  estabelecimentoId: string;
  serial: string;
  nome: string;
  modelo?: number | undefined;
  ip?: string | null | undefined;
  centroTrabalho?: string | null | undefined;
}

/**
 * Cadastra um coletor. O serial é único no tenant inteiro (não só no
 * estabelecimento) porque é a identidade do aparelho no broker — dois
 * dispositivos com o mesmo serial colidiriam como client_id MQTT.
 */
export class CriarDispositivoIotUseCase {
  constructor(
    private readonly dispositivos: DispositivoIotRepository,
    private readonly estabelecimentos: VerificadorEstabelecimento,
    private readonly ids: GeradorId,
  ) {}

  async executar(input: CriarDispositivoIotInput): Promise<DispositivoIotDTO> {
    if (!(await this.estabelecimentos.existe(input.estabelecimentoId))) {
      throw new EstabelecimentoNaoEncontradoError(input.estabelecimentoId);
    }
    if (!(await this.estabelecimentos.estaAtivo(input.estabelecimentoId))) {
      throw new EstabelecimentoInativoError(input.estabelecimentoId);
    }

    const serial = (input.serial ?? '').trim();
    if (await this.dispositivos.buscarPorSerial(serial)) {
      throw new SerialIotJaExisteError(serial);
    }

    const dispositivo = DispositivoIot.criar({
      idDispositivoIot: this.ids.gerar(),
      serial,
      nome: input.nome,
      estabelecimentoId: input.estabelecimentoId,
      modelo: input.modelo,
      ip: input.ip,
      centroTrabalho: input.centroTrabalho,
    });

    await this.dispositivos.salvar(dispositivo);
    // Recém-criado: ainda não há conexão associada a consultar.
    return paraDispositivoIotDTO(dispositivo, false);
  }
}
