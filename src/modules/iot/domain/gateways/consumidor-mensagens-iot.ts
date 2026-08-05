/**
 * Tipos de mensagem do protocolo do coletor (migrado de Octopus
 * `EnumTipoMsgIOT`). Só MOVIMENT carrega leitura de chão de fábrica; os demais
 * são controle e são ignorados pelo pipeline de contagem.
 */
export const TIPOS_MENSAGEM_IOT = [
  'REGISTER',
  'REPORT',
  'MOVIMENT',
  'CONFIGURATION',
  'UPDATE',
  'UPDATESTARTED',
  'UPDATECOMPLETED',
  'UPDATEFAILED',
] as const;

export type TipoMensagemIot = (typeof TIPOS_MENSAGEM_IOT)[number];

/**
 * Uma leitura como o dispositivo a emite — ainda em vocabulário do firmware
 * (serial, input, context numérico). A tradução para o domínio acontece no
 * use-case, que resolve o dispositivo pelo serial.
 */
export interface MovimentoRecebido {
  /** client_id / serialIOT do dispositivo de origem. */
  serial: string;
  input: number;
  /** Índice do contexto no enum do firmware (0=PRODUCAO, 1=PARADA, …). */
  contexto: number;
  valor: number;
  ocorridoEm: Date;
}

/** Mensagem bruta recebida do broker, já decodificada. */
export interface MensagemIot {
  tipo: TipoMensagemIot | string;
  serial: string;
  /** Payload cru — a forma varia por tipo; só MOVIMENT é interpretado. */
  dados: unknown;
}

/**
 * Porta de consumo do broker. O adaptador AMQP assina a fila do tenant e
 * entrega cada mensagem ao handler; devolver a promise resolvida significa
 * "processada com sucesso" (ack), e lançar significa rejeitar (nack).
 */
export interface ConsumidorMensagensIot {
  consumir(handler: (mensagem: MensagemIot) => Promise<void>): Promise<void>;
  encerrar(): Promise<void>;
}
