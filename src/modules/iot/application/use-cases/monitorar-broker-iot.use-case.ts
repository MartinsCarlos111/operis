import type { MonitorBrokerIot } from '../../domain/gateways/monitor-broker-iot.js';
import {
  paraEstadoBrokerIotDTO,
  type EstadoBrokerIotDTO,
} from '../dtos/estado-broker-iot.dto.js';

/** Consulta o status do broker do tenant autenticado para a tela Broker IoT. */
export class MonitorarBrokerIotUseCase {
  constructor(
    private readonly monitor: MonitorBrokerIot,
    private readonly agora: () => Date = () => new Date(),
  ) {}

  async executar(tenantId: string): Promise<EstadoBrokerIotDTO> {
    const estado = await this.monitor.consultar(tenantId);
    return paraEstadoBrokerIotDTO(estado, this.agora());
  }
}
