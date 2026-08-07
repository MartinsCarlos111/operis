import type { Server as HttpServer } from 'node:http';
import type { EventoTempoReal, NotificadorTempoReal } from '../../domain/gateways/notificador-tempo-real.js';

/**
 * Adaptador Socket.IO do `NotificadorTempoReal`. Reboot idiomático do
 * `IotHub`/`ChatHub` SignalR legado: o registro `connectionId ↔ serialIot` é
 * resolvido em tempo de execução via salas, sem precisar de cache externo —
 * cada conexão que faz handshake com `?serialIot=X` entra em `sala:X`.
 *
 * A instância é mantida como singleton no módulo realtime para reaproveitar
 * a mesma ligação Engine.IO entre todos os emissores.
 */
import { Server as IoServer, type Socket } from 'socket.io';

const SALA_PREFIX = 'sala:';

export class SocketIoGateway implements NotificadorTempoReal {
  private readonly io: IoServer;
  /** Conexões ativas por serial — para depuração e relatórios admin. */
  private readonly conexoesPorSerial = new Map<string, Set<string>>();

  constructor(servidorHttp: HttpServer) {
    this.io = new IoServer(servidorHttp, {
      path: '/realtime',
      cors: { origin: true, credentials: true },
    });

    this.io.on('connection', (socket: Socket) => {
      const serial = (socket.handshake.query['serialIot'] as string | undefined)?.trim();
      if (!serial) {
        // Conexão sem serial não pode ser roteada — descarta.
        void socket.disconnect(true);
        return;
      }
      const idConexao = socket.id;
      this.registrar(serial, idConexao);
      socket.join(this.sala(serial));

      socket.on('disconnect', () => {
        this.unregistrar(serial, idConexao);
      });
    });
  }

  async entrarSala(serialIot: string, idConexao: string): Promise<void> {
    this.registrar(serialIot, idConexao);
    const socket = this.io.sockets.sockets.get(idConexao);
    if (socket) socket.join(this.sala(serialIot));
  }

  async sairSala(serialIot: string, idConexao: string): Promise<void> {
    this.unregistrar(serialIot, idConexao);
    const socket = this.io.sockets.sockets.get(idConexao);
    if (socket) socket.leave(this.sala(serialIot));
  }

  async emitirParaSala<T>(serialIot: string, evento: EventoTempoReal, payload: T): Promise<void> {
    this.io.to(this.sala(serialIot)).emit(evento, payload);
  }

  async emitirBroadcast<T>(evento: EventoTempoReal, payload: T): Promise<void> {
    this.io.emit(evento, payload);
  }

  async encerrar(): Promise<void> {
    await new Promise<void>((resolve) => this.io.close(() => resolve()));
  }

  /** Quantidade de clientes conectados ao serial; útil para painel admin. */
  qtdConexoes(serialIot: string): number {
    return this.conexoesPorSerial.get(serialIot)?.size ?? 0;
  }

  private sala(serial: string): string {
    return `${SALA_PREFIX}${serial}`;
  }

  private registrar(serial: string, id: string): void {
    let set = this.conexoesPorSerial.get(serial);
    if (!set) {
      set = new Set<string>();
      this.conexoesPorSerial.set(serial, set);
    }
    set.add(id);
  }

  private unregistrar(serial: string, id: string): void {
    const set = this.conexoesPorSerial.get(serial);
    if (!set) return;
    set.delete(id);
    if (set.size === 0) this.conexoesPorSerial.delete(serial);
  }
}