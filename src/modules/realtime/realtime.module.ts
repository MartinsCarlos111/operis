import type { Server as HttpServer } from 'node:http';
import { SocketIoGateway } from './infrastructure/gateways/socket-io-gateway.js';
import { realtimeRoutes } from './infrastructure/http/realtime.routes.js';

/**
 * Composition root do módulo realtime. Substitui os `IotHub`/`ChatHub` SignalR
 * do legado (e os `SignalRService.NotifyClients`). A instância do
 * `SocketIoGateway` deve ser única por processo API — reutilizada pelas порções
 * que precisam emitir eventos (estendendo no futuro: `realtime` recebe emitters
 * de outros módulos via DI manual).
 *
 *   const realtime = construirModuloRealtime(app.server);   // após app.listen
 *   app.register(realtime.routes);
 */
export function construirModuloRealtime(servidorHttp: HttpServer) {
  const gateway = new SocketIoGateway(servidorHttp);

  return {
    /** Porta injetável em outros módulos (ex.: iot, manufatura, notificacoes). */
    notificador: gateway,
    routes: realtimeRoutes({ notificador: gateway }),
  };
}