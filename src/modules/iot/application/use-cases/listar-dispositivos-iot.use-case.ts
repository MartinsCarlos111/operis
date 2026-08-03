import type { DispositivoIotRepository } from '../../domain/repositories/dispositivo-iot.repository.js';
import type { ConsultorConexoesBroker } from '../../domain/gateways/consultor-conexoes-broker.js';
import { paraDispositivoIotDTO, type DispositivoIotDTO } from '../dtos/dispositivo-iot.dto.js';

export interface ListarDispositivosIotInput {
  /** Tenant corrente — necessário para achar o broker no Control Plane. */
  tenantId: string;
  estabelecimentoId: string;
  startIndex?: number | undefined;
  maxRows?: number | undefined;
  termo?: string | undefined;
}

export interface ListarDispositivosIotOutput {
  count: number;
  model: DispositivoIotDTO[];
}

/**
 * Lista os coletores do estabelecimento com o status online resolvido a partir
 * das conexões abertas no broker — o cadastro vem do banco, o "está ligado
 * agora" vem do RabbitMQ, cruzados pelo serial (= client_id MQTT).
 */
export class ListarDispositivosIotUseCase {
  constructor(
    private readonly dispositivos: DispositivoIotRepository,
    private readonly broker: ConsultorConexoesBroker,
  ) {}

  async executar(input: ListarDispositivosIotInput): Promise<ListarDispositivosIotOutput> {
    const criterio = {
      estabelecimentoId: input.estabelecimentoId,
      startIndex: input.startIndex ?? 0,
      maxRows: input.maxRows ?? 50,
      termo: input.termo,
    };

    const [lista, count, conectados] = await Promise.all([
      this.dispositivos.listar(criterio),
      this.dispositivos.contar(input.estabelecimentoId, input.termo),
      this.broker.seriaisConectados(input.tenantId),
    ]);

    return {
      count,
      model: lista.map((d) => paraDispositivoIotDTO(d, conectados.has(d.serial))),
    };
  }
}
