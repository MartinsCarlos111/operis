import type { FastifyInstance } from 'fastify';

/**
 * Plugin Fastify do módulo realtime. Apenas registra o hook para anexar o
 * gerente de salas à instância (rotas de admin opcionais podem ser
 * adicionadas aqui). A porta Socket.IO é montada no servidor HTTP pelo
 * composition root — o Fastify cede o `server` via `app.server` após o `listen`.
 *
 * IMPORTANTE: o `SocketIoGateway` precisa do `http.Server` *depois* de
 * `app.listen()`. O composition root em `ts/app.ts` chama `listen` e só então
 * constrói o gateway.
 */
export interface RealtimeRoutesDeps {
  /** Acesso ao gateway injetado pelo composition root. */
  notificador: {
    qtdConexoes(serialIot: string): number;
  };
}

export function realtimeRoutes(_deps: RealtimeRoutesDeps) {
  return async function plugin(_fastify: FastifyInstance): Promise<void> {
    // Ancora para rotas admin futuras (ex.: /realtime/conexoes/:serial).
    // Hoje só existe aEngine.IO attachada ao http.Server compartilhado.
  };
}