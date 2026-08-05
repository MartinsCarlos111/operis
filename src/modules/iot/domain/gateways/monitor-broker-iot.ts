/** Um cliente conectado ao broker, geralmente uma sessao MQTT de coletor. */
export interface ClienteBrokerIot {
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

/** Retrato operacional do broker do tenant. */
export interface EstadoBrokerIot {
  status: 'ONLINE' | 'OFFLINE';
  host: string;
  porta: number;
  virtualHost: string;
  versao: string;
  totalConexoes: number;
  totalFilas: number;
  publicadasDesdeBoot: number;
  clientes: ClienteBrokerIot[];
  detalhe?: string;
}

/** Consulta o broker configurado para o tenant corrente sem expor credenciais. */
export interface MonitorBrokerIot {
  consultar(tenantId: string): Promise<EstadoBrokerIot>;
}
