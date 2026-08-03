/**
 * Credenciais de acesso ao broker em texto puro — existem SOMENTE em memória,
 * no instante da consulta. Nunca persistidas nem logadas assim.
 */
export interface DadosAcessoBroker {
  host: string;
  porta: number;
  virtualHost: string;
  usuario: string;
  senha: string;
  sslHabilitado: boolean;
}

/** Um cliente conectado ao broker (no caso dos coletores, uma sessão MQTT). */
export interface ClienteConectado {
  /** client_id MQTT — equivale ao serialIOT do octopus. */
  clientId: string;
  protocolo: string;
  usuario: string;
  virtualHost: string;
  ip: string;
  conectadoDesde: string;
  bytesRecebidos: number;
  bytesEnviados: number;
  /** Tópicos que o cliente assinou, derivados dos bindings da amq.topic. */
  topicosAssinados: string[];
}

/** Retrato do broker num instante: saúde da conexão + quem está conectado. */
export interface EstadoBroker {
  host: string;
  porta: number;
  virtualHost: string;
  versao: string;
  totalConexoes: number;
  totalFilas: number;
  publicadasDesdeBoot: number;
  clientes: ClienteConectado[];
}

/**
 * Porta de observação do broker de um tenant. A implementação consulta a
 * Management API do RabbitMQ (HTTP), que é a única fonte que sabe quem está
 * conectado agora — informação que o protocolo AMQP não expõe ao consumidor.
 * Lança BrokerInacessivelError se não alcançar/autenticar.
 */
export interface MonitorBroker {
  consultar(dados: DadosAcessoBroker): Promise<EstadoBroker>;
}
