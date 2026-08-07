/**
 * Porta de notificação em tempo real (substitui o `IotHub`/`ChatHub` SignalR
 * do legado). Adaptadores concretos (ex.: `SocketIoGateway`) implementam esta
 * porta — o domínio não conhece Socket.IO.
 *
 * Salas são identificadas por `serialIot` (paridade com o `?serialIot=` do
 * `IotHub`): cada cliente conectado entra na sala do dispositivo que abriu,
 * permitindo `REPORT` e atualizações de config serem pushados entre os
 * observadores daquele coletor.
 */

/** Evento realtime identificado — paridade com os métodos do `IotHub`. */
export type EventoTempoReal =
  | 'OnReporteEvent'
  | 'OnParadaEvent'
  | 'ReceiveDeviceConfig'
  | 'OnMensagemChat'
  | 'OnUsuarioConectado'
  | 'OnUsuarioDesconectado';

/** Payload do evento é livre — quem emite sabe o formato de cada tipo. */
export interface NotificadorTempoReal {
  /** Junta a conexão atual à sala do dispositivo/serial. */
  entrarSala(serialIot: string, idConexao: string): Promise<void>;
  /** Sai da sala (tipicamente no disconnect). */
  sairSala(serialIot: string, idConexao: string): Promise<void>;
  /** Emite um evento a todos os conexões da sala do serial. */
  emitirParaSala<T>(serialIot: string, evento: EventoTempoReal, payload: T): Promise<void>;
  /** Emite a todos (broadcast global — usado em raras situações admin). */
  emitirBroadcast<T>(evento: EventoTempoReal, payload: T): Promise<void>;
  /** Encerra o transporte (graceful shutdown do worker/API). */
  encerrar(): Promise<void>;
}

export type { EventoTempoReal as Evento };