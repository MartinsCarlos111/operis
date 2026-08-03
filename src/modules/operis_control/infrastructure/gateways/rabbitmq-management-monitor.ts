import { BrokerInacessivelError } from '../../domain/exceptions/index.js';
import type {
  ClienteConectado,
  DadosAcessoBroker,
  EstadoBroker,
  MonitorBroker,
} from '../../domain/gateways/monitor-broker.js';

/** Porta padrão do plugin de management (rabbitmq_management). */
const PORTA_MANAGEMENT_PADRAO = 15672;

/** Recortes dos payloads da Management API — só o que é consumido aqui. */
interface OverviewResponse {
  rabbitmq_version?: string;
  object_totals?: { connections?: number; queues?: number };
  message_stats?: { publish?: number };
}
interface ConnectionResponse {
  name?: string;
  protocol?: string;
  user?: string;
  vhost?: string;
  peer_host?: string;
  peer_port?: number;
  connected_at?: number;
  recv_oct?: number;
  send_oct?: number;
  client_properties?: { client_id?: string; product?: string };
}
interface BindingResponse {
  source?: string;
  routing_key?: string;
  destination?: string;
  destination_type?: string;
}

/**
 * Adaptador do MonitorBroker sobre a HTTP Management API do RabbitMQ.
 *
 * Por que HTTP e não AMQP: só o broker sabe quem está conectado agora, e essa
 * informação não é exposta pelo protocolo AMQP a um cliente comum. É também
 * como o octopus valida o broker — lá de forma implícita, pelo erro de conexão.
 *
 * A porta de management é independente da porta AMQP guardada na config do
 * tenant (que pode inclusive ter sido remapeada), por isso é parametrizável.
 */
export class RabbitMqManagementMonitor implements MonitorBroker {
  constructor(
    private readonly portaManagement: number = PORTA_MANAGEMENT_PADRAO,
    private readonly timeoutMs: number = 10_000,
  ) {}

  async consultar(dados: DadosAcessoBroker): Promise<EstadoBroker> {
    const protocolo = dados.sslHabilitado ? 'https' : 'http';
    const base = `${protocolo}://${dados.host}:${this.portaManagement}`;
    const auth = Buffer.from(`${dados.usuario}:${dados.senha}`).toString('base64');

    const [overview, conexoes, bindings] = await Promise.all([
      this.buscar<OverviewResponse>(`${base}/api/overview`, auth),
      this.buscar<ConnectionResponse[]>(`${base}/api/connections`, auth),
      this.buscar<BindingResponse[]>(`${base}/api/bindings`, auth),
    ]);

    const clientes = (Array.isArray(conexoes) ? conexoes : [])
      .filter((c) => c.vhost === dados.virtualHost)
      .map((c) => this.paraCliente(c, Array.isArray(bindings) ? bindings : []));

    return {
      host: dados.host,
      porta: dados.porta,
      virtualHost: dados.virtualHost,
      versao: overview.rabbitmq_version ?? 'desconhecida',
      totalConexoes: overview.object_totals?.connections ?? clientes.length,
      totalFilas: overview.object_totals?.queues ?? 0,
      publicadasDesdeBoot: overview.message_stats?.publish ?? 0,
      clientes,
    };
  }

  /**
   * Deriva os tópicos assinados a partir dos bindings da amq.topic. Um cliente
   * MQTT gera uma fila `mqtt-subscription-<clientId>qos<n>`, e cada assinatura
   * vira um binding apontando para ela.
   */
  private paraCliente(conexao: ConnectionResponse, bindings: BindingResponse[]): ClienteConectado {
    const clientId =
      conexao.client_properties?.client_id ?? conexao.client_properties?.product ?? conexao.name ?? '—';

    const topicos = bindings
      .filter(
        (b) =>
          b.destination_type === 'queue' &&
          typeof b.destination === 'string' &&
          b.destination.includes(clientId) &&
          typeof b.routing_key === 'string' &&
          b.routing_key.length > 0,
      )
      .map((b) => b.routing_key as string);

    const ip =
      conexao.peer_host && conexao.peer_port
        ? `${conexao.peer_host}:${conexao.peer_port}`
        : (conexao.peer_host ?? '—');

    return {
      clientId,
      protocolo: conexao.protocol ?? '—',
      usuario: conexao.user ?? '—',
      virtualHost: conexao.vhost ?? '/',
      ip,
      conectadoDesde: conexao.connected_at
        ? new Date(conexao.connected_at).toISOString()
        : new Date(0).toISOString(),
      bytesRecebidos: conexao.recv_oct ?? 0,
      bytesEnviados: conexao.send_oct ?? 0,
      topicosAssinados: [...new Set(topicos)],
    };
  }

  private async buscar<T>(url: string, auth: string): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const resposta = await fetch(url, {
        headers: { Authorization: `Basic ${auth}` },
        signal: controller.signal,
      });
      if (resposta.status === 401) {
        throw new BrokerInacessivelError('credenciais recusadas pelo broker');
      }
      if (!resposta.ok) {
        throw new BrokerInacessivelError(`a API de management respondeu ${resposta.status}`);
      }
      return (await resposta.json()) as T;
    } catch (erro) {
      if (erro instanceof BrokerInacessivelError) throw erro;
      const motivo =
        erro instanceof Error && erro.name === 'AbortError'
          ? `sem resposta em ${this.timeoutMs}ms`
          : erro instanceof Error
            ? erro.message
            : 'erro desconhecido';
      throw new BrokerInacessivelError(motivo, { cause: erro });
    } finally {
      clearTimeout(timer);
    }
  }
}
