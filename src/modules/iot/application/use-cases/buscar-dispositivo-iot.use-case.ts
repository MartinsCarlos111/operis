import type { DispositivoIotRepository } from '../../domain/repositories/dispositivo-iot.repository.js';
import type { ConsultorConexoesBroker } from '../../domain/gateways/consultor-conexoes-broker.js';
import { DispositivoIotNaoEncontradoError } from '../../domain/exceptions/index.js';
import { paraDispositivoIotDTO, type DispositivoIotDTO } from '../dtos/dispositivo-iot.dto.js';

/** Detalha um coletor (com suas entradas) e resolve o online pelo broker. */
export class BuscarDispositivoIotUseCase {
  constructor(
    private readonly dispositivos: DispositivoIotRepository,
    private readonly broker: ConsultorConexoesBroker,
  ) {}

  async executar(
    id: string,
    estabelecimentoId: string,
    tenantId: string,
  ): Promise<DispositivoIotDTO> {
    const dispositivo = await this.dispositivos.buscarPorId(id, estabelecimentoId);
    if (!dispositivo) {
      throw new DispositivoIotNaoEncontradoError(id);
    }
    const conectados = await this.broker.seriaisConectados(tenantId);
    return paraDispositivoIotDTO(dispositivo, conectados.has(dispositivo.serial));
  }
}
