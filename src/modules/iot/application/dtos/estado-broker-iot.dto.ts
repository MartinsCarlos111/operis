import type { EstadoBrokerIot } from '../../domain/gateways/monitor-broker-iot.js';

export interface ClienteBrokerIotDTO {
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

export interface EstadoBrokerIotDTO {
  status: 'ONLINE' | 'OFFLINE';
  host: string;
  porta: number;
  virtualHost: string;
  versao: string;
  verificadoEm: string;
  totalConexoes: number;
  totalFilas: number;
  publicadasDesdeBoot: number;
  clientes: ClienteBrokerIotDTO[];
  detalhe?: string;
}

export function paraEstadoBrokerIotDTO(
  estado: EstadoBrokerIot,
  verificadoEm: Date,
): EstadoBrokerIotDTO {
  return {
    status: estado.status,
    host: estado.host,
    porta: estado.porta,
    virtualHost: estado.virtualHost,
    versao: estado.versao,
    verificadoEm: verificadoEm.toISOString(),
    totalConexoes: estado.totalConexoes,
    totalFilas: estado.totalFilas,
    publicadasDesdeBoot: estado.publicadasDesdeBoot,
    clientes: estado.clientes.map((c) => ({ ...c })),
    ...(estado.detalhe ? { detalhe: estado.detalhe } : {}),
  };
}
