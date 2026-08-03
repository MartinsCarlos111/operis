import type { EstadoBroker } from '../../domain/gateways/monitor-broker.js';

/** Um coletor conectado, como a tela de monitoramento consome. */
export interface ClienteBrokerDTO {
  clientId: string;
  protocolo: string;
  usuario: string;
  virtualHost: string;
  ip: string;
  conectadoDesde: string;
  bytesRecebidos: number;
  bytesEnviados: number;
  topicosAssinados: string[];
}

/**
 * Saída do monitor de broker. Nunca inclui credenciais — só host/porta/vhost,
 * que já são metadados públicos da config, e o retrato operacional.
 */
export interface EstadoBrokerDTO {
  status: 'ONLINE' | 'OFFLINE';
  host: string;
  porta: number;
  virtualHost: string;
  versao: string;
  verificadoEm: string;
  totalConexoes: number;
  totalFilas: number;
  publicadasDesdeBoot: number;
  clientes: ClienteBrokerDTO[];
}

export function paraEstadoBrokerDTO(estado: EstadoBroker, verificadoEm: Date): EstadoBrokerDTO {
  return {
    status: 'ONLINE',
    host: estado.host,
    porta: estado.porta,
    virtualHost: estado.virtualHost,
    versao: estado.versao,
    verificadoEm: verificadoEm.toISOString(),
    totalConexoes: estado.totalConexoes,
    totalFilas: estado.totalFilas,
    publicadasDesdeBoot: estado.publicadasDesdeBoot,
    clientes: estado.clientes.map((c) => ({
      clientId: c.clientId,
      protocolo: c.protocolo,
      usuario: c.usuario,
      virtualHost: c.virtualHost,
      ip: c.ip,
      conectadoDesde: c.conectadoDesde,
      bytesRecebidos: c.bytesRecebidos,
      bytesEnviados: c.bytesEnviados,
      topicosAssinados: c.topicosAssinados,
    })),
  };
}
