import type { ConfiguracaoRabbitMqTenantRepository } from '../../domain/repositories/configuracao-rabbitmq-tenant.repository.js';
import type { EncryptionService } from '../../domain/gateways/encryption-service.js';
import type { MonitorBroker } from '../../domain/gateways/monitor-broker.js';
import { TenantNaoEncontradoError } from '../../domain/exceptions/index.js';
import { paraEstadoBrokerDTO, type EstadoBrokerDTO } from '../dtos/estado-broker.dto.js';

/**
 * Consulta o estado do broker de um tenant: se responde e quais coletores
 * estão conectados (por client_id). Espelha TestarConexaoTenantUseCase — a
 * senha é decifrada apenas em memória, no instante da consulta.
 *
 * 404 se o tenant não tem RabbitMQ configurado; BrokerInacessivelError (422)
 * se a config existe mas o broker não responde.
 */
export class MonitorarBrokerTenantUseCase {
  constructor(
    private readonly configs: ConfiguracaoRabbitMqTenantRepository,
    private readonly encryption: EncryptionService,
    private readonly monitor: MonitorBroker,
    private readonly agora: () => Date = () => new Date(),
  ) {}

  async executar(tenantId: string): Promise<EstadoBrokerDTO> {
    const config = await this.configs.buscarPorTenant(tenantId);
    if (!config) {
      throw new TenantNaoEncontradoError(`${tenantId} (sem RabbitMQ configurado)`);
    }

    const estado = await this.monitor.consultar({
      host: config.host,
      porta: config.porta,
      virtualHost: config.virtualHost,
      usuario: config.usuario,
      senha: this.encryption.decifrar(config.senhaCifrada),
      sslHabilitado: config.sslHabilitado,
    });

    return paraEstadoBrokerDTO(estado, this.agora());
  }
}
