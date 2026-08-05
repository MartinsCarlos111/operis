import type {
  ClienteBrokerIot,
  EstadoBrokerIot,
  MonitorBrokerIot,
} from '../../domain/gateways/monitor-broker-iot.js';
import type {
  AcessoManagementBroker,
  ResolvedorAcessoBroker,
} from './rabbitmq-consultor-conexoes.js';

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

/** Monitor do broker para usuarios do tenant. Broker indisponivel vira OFFLINE. */
export class RabbitMqMonitorBrokerIot implements MonitorBrokerIot {
  constructor(
    private readonly resolverAcesso: ResolvedorAcessoBroker,
    private readonly timeoutMs: number = 10_000,
  ) {}

  async consultar(tenantId: string): Promise<EstadoBrokerIot> {
    const acesso = await this.resolverAcesso(tenantId).catch(() => null);
    if (!acesso) {
      return this.offline(null, 'RabbitMQ nao configurado para este tenant');
    }

    const protocolo = acesso.sslHabilitado ? 'https' : 'http';
    const base = `${protocolo}://${acesso.host}:${acesso.portaManagement}`;
    const auth = Buffer.from(`${acesso.usuario}:${acesso.senha}`).toString('base64');

    try {
      const [overview, conexoes, bindings] = await Promise.all([
        this.buscar<OverviewResponse>(`${base}/api/overview`, auth),
        this.buscar<ConnectionResponse[]>(`${base}/api/connections`, auth),
        this.buscar<BindingResponse[]>(`${base}/api/bindings`, auth),
      ]);

      const listaConexoes = Array.isArray(conexoes) ? conexoes : [];
      const listaBindings = Array.isArray(bindings) ? bindings : [];
      const clientes = listaConexoes
        .filter((c) => c.vhost === acesso.virtualHost)
        .map((c) => this.paraCliente(c, listaBindings));

      return {
        status: 'ONLINE',
        host: acesso.host,
        porta: acesso.porta,
        virtualHost: acesso.virtualHost,
        versao: overview.rabbitmq_version ?? 'desconhecida',
        totalConexoes: overview.object_totals?.connections ?? clientes.length,
        totalFilas: overview.object_totals?.queues ?? 0,
        publicadasDesdeBoot: overview.message_stats?.publish ?? 0,
        clientes,
      };
    } catch (erro) {
      const detalhe = erro instanceof Error ? erro.message : 'erro desconhecido';
      return this.offline(acesso, detalhe);
    }
  }

  private offline(
    acesso: AcessoManagementBroker | null,
    detalhe: string,
  ): EstadoBrokerIot {
    return {
      status: 'OFFLINE',
      host: acesso?.host ?? '',
      porta: acesso?.porta ?? 0,
      virtualHost: acesso?.virtualHost ?? '',
      versao: 'indisponivel',
      totalConexoes: 0,
      totalFilas: 0,
      publicadasDesdeBoot: 0,
      clientes: [],
      detalhe,
    };
  }

  private paraCliente(
    conexao: ConnectionResponse,
    bindings: BindingResponse[],
  ): ClienteBrokerIot {
    const clientId =
      conexao.client_properties?.client_id ??
      conexao.client_properties?.product ??
      conexao.name ??
      '-';

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
        : (conexao.peer_host ?? '-');

    return {
      clientId,
      protocolo: conexao.protocol ?? '-',
      usuario: conexao.user ?? '-',
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
        throw new Error('credenciais recusadas pelo broker');
      }
      if (!resposta.ok) {
        throw new Error(`a API de management respondeu ${resposta.status}`);
      }

      return (await resposta.json()) as T;
    } catch (erro) {
      if (erro instanceof Error && erro.name === 'AbortError') {
        throw new Error(`sem resposta em ${this.timeoutMs}ms`, { cause: erro });
      }
      throw erro;
    } finally {
      clearTimeout(timer);
    }
  }
}
