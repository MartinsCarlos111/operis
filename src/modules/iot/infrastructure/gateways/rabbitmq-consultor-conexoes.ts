import type { ConsultorConexoesBroker } from '../../domain/gateways/consultor-conexoes-broker.js';

/** Credenciais de acesso à Management API, resolvidas por requisição. */
export interface AcessoManagementBroker {
  host: string;
  /** Porta AMQP/MQTT configurada para o tenant, exibida no monitor. */
  porta: number;
  portaManagement: number;
  usuario: string;
  senha: string;
  virtualHost: string;
  sslHabilitado: boolean;
}

/**
 * Resolve o acesso ao broker de um tenant. É injetado de fora (pelo
 * composition root) porque a config vive no Control Plane, e o módulo iot não
 * pode depender daquele módulo — a fronteira é verificada pelo dependency-cruiser.
 * Retorna null quando o tenant não tem broker configurado.
 */
export type ResolvedorAcessoBroker = (
  tenantId: string,
) => Promise<AcessoManagementBroker | null>;

interface ConnectionResponse {
  vhost?: string;
  client_properties?: { client_id?: string };
}

/**
 * Deriva os seriais conectados a partir das conexões abertas no broker.
 *
 * Degrada em silêncio para conjunto vazio se o broker estiver inacessível ou
 * não configurado: a listagem de coletores não pode quebrar porque a
 * mensageria caiu — nesse caso todos simplesmente aparecem como offline.
 */
export class RabbitMqConsultorConexoes implements ConsultorConexoesBroker {
  constructor(
    private readonly resolverAcesso: ResolvedorAcessoBroker,
    private readonly timeoutMs: number = 5_000,
  ) {}

  async seriaisConectados(tenantId: string): Promise<Set<string>> {
    const acesso = await this.resolverAcesso(tenantId).catch(() => null);
    if (!acesso) return new Set();

    const protocolo = acesso.sslHabilitado ? 'https' : 'http';
    const url = `${protocolo}://${acesso.host}:${acesso.portaManagement}/api/connections`;
    const auth = Buffer.from(`${acesso.usuario}:${acesso.senha}`).toString('base64');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const resposta = await fetch(url, {
        headers: { Authorization: `Basic ${auth}` },
        signal: controller.signal,
      });
      if (!resposta.ok) return new Set();

      const conexoes = (await resposta.json()) as ConnectionResponse[];
      if (!Array.isArray(conexoes)) return new Set();

      return new Set(
        conexoes
          .filter((c) => c.vhost === acesso.virtualHost)
          .map((c) => c.client_properties?.client_id)
          .filter((id): id is string => typeof id === 'string' && id.length > 0),
      );
    } catch {
      return new Set();
    } finally {
      clearTimeout(timer);
    }
  }
}
