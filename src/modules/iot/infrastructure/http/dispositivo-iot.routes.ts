import type { FastifyInstance, preHandlerAsyncHookHandler } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { CriarDispositivoIotUseCase } from '../../application/use-cases/criar-dispositivo-iot.use-case.js';
import type { EditarDispositivoIotUseCase } from '../../application/use-cases/editar-dispositivo-iot.use-case.js';
import type { ExcluirDispositivoIotUseCase } from '../../application/use-cases/excluir-dispositivo-iot.use-case.js';
import type { BuscarDispositivoIotUseCase } from '../../application/use-cases/buscar-dispositivo-iot.use-case.js';
import type { ListarDispositivosIotUseCase } from '../../application/use-cases/listar-dispositivos-iot.use-case.js';
import type { ConsultarContadoresIotUseCase } from '../../application/use-cases/consultar-contadores-iot.use-case.js';
import type { ConsultarFalhasIotUseCase } from '../../application/use-cases/consultar-falhas-iot.use-case.js';
import type { ConsultarLinhaDoTempoIotUseCase } from '../../application/use-cases/consultar-linha-do-tempo-iot.use-case.js';
import type { MonitorarBrokerIotUseCase } from '../../application/use-cases/monitorar-broker-iot.use-case.js';
import {
  CONTEXTOS_IOT,
  FUNCOES_IOT,
  TIPOS_ENTRADA_IOT,
} from '../../domain/entities/entrada-iot.js';

const listarQuery = z.object({
  startIndex: z.coerce.number().int().min(0).default(0),
  maxRows: z.coerce.number().int().min(1).max(500).default(50),
  termo: z.string().trim().min(1).optional(),
});

const entradaBody = z.object({
  id: z.string().uuid().optional(),
  input: z.number().int().min(0),
  label: z.string().min(1),
  tipo: z.enum(TIPOS_ENTRADA_IOT),
  contexto: z.enum(CONTEXTOS_IOT),
  funcao: z.enum(FUNCOES_IOT),
  param1: z.number().nullable().optional(),
  param2: z.number().nullable().optional(),
  param3: z.number().nullable().optional(),
  param4: z.number().nullable().optional(),
  analogicaComoDigital: z.boolean().optional(),
  habilitado: z.boolean().optional(),
});

/** O serial só entra na criação — depois é imutável (identidade no broker). */
const criarBody = z.object({
  serial: z.string().min(1),
  nome: z.string().min(1),
  modelo: z.number().int().min(0).optional(),
  ip: z.string().nullable().optional(),
  centroTrabalhoId: z.string().uuid().nullable().optional(),
});

const editarBody = z.object({
  nome: z.string().min(1),
  modelo: z.number().int().min(0).optional(),
  ip: z.string().nullable().optional(),
  centroTrabalhoId: z.string().uuid().nullable().optional(),
  entradas: z.array(entradaBody).optional(),
});

const idParam = z.object({ id: z.string().uuid() });

/** Janela de agregação dos contadores. Sem período, o use-case usa 24h. */
const periodoQuery = z.object({
  de: z.string().datetime().optional(),
  ate: z.string().datetime().optional(),
});

/**
 * O tenantId é garantido pelo preHandler `resolverTenant`, que barra com 403
 * qualquer request cujo token não esteja vinculado a um tenant. O throw aqui é
 * defesa em profundidade: se a cadeia mudar, falha explicitamente em vez de
 * consultar o broker com um tenant vazio.
 */
function tenantIdDe(request: { user?: { tenantId?: string | undefined } }): string {
  const tenantId = request.user?.tenantId;
  if (!tenantId) {
    throw new Error('tenantId ausente na request — resolverTenant deveria tê-la barrado');
  }
  return tenantId;
}

export interface DispositivoIotUseCases {
  criarDispositivo: CriarDispositivoIotUseCase;
  editarDispositivo: EditarDispositivoIotUseCase;
  excluirDispositivo: ExcluirDispositivoIotUseCase;
  buscarDispositivo: BuscarDispositivoIotUseCase;
  listarDispositivos: ListarDispositivosIotUseCase;
  consultarContadores: ConsultarContadoresIotUseCase;
  consultarFalhas: ConsultarFalhasIotUseCase;
  consultarLinhaDoTempo: ConsultarLinhaDoTempoIotUseCase;
}

export interface DispositivoIotRoutesDeps {
  montarUseCases: (prisma: PrismaClient) => DispositivoIotUseCases;
  monitorarBroker: MonitorarBrokerIotUseCase;
  autenticar: preHandlerAsyncHookHandler;
  resolverTenant: preHandlerAsyncHookHandler;
  exigirEstabelecimento: preHandlerAsyncHookHandler;
  autorizar: (...chaves: string[]) => preHandlerAsyncHookHandler;
}

/**
 * Adaptador HTTP dos coletores IoT (migrado de CentroTrabalhoIOTController +
 * ConfigIOTController). O status online de cada dispositivo é resolvido pelo
 * broker no momento da resposta — nunca lido do banco.
 */
export function dispositivoIotRoutes(deps: DispositivoIotRoutesDeps) {
  const contexto = [deps.autenticar, deps.resolverTenant, deps.exigirEstabelecimento];
  const seguranca = [{ bearerAuth: [], estabelecimentoHeader: [] }];

  return async function plugin(fastify: FastifyInstance): Promise<void> {
    const app = fastify.withTypeProvider<ZodTypeProvider>();

    app.get(
      '/monitor-broker',
      {
        preHandler: [...contexto, deps.autorizar('dispositivos-iot:list')],
        schema: {
          tags: ['dispositivos-iot'],
          summary: 'Estado do broker IoT do tenant autenticado',
          security: seguranca,
        },
      },
      async (request, reply) => {
        const dto = await deps.monitorarBroker.executar(tenantIdDe(request));
        return reply.status(200).send(dto);
      },
    );

    app.get(
      '/dispositivos-iot',
      {
        preHandler: [...contexto, deps.autorizar('dispositivos-iot:list')],
        schema: {
          tags: ['dispositivos-iot'],
          summary: 'Lista os coletores IoT do estabelecimento (com status online)',
          security: seguranca,
          querystring: listarQuery,
        },
      },
      async (request, reply) => {
        const { listarDispositivos } = deps.montarUseCases(request.prismaTenant);
        const resultado = await listarDispositivos.executar({
          tenantId: tenantIdDe(request),
          estabelecimentoId: request.estabelecimentoId,
          startIndex: request.query.startIndex,
          maxRows: request.query.maxRows,
          termo: request.query.termo,
        });
        return reply.status(200).send(resultado);
      },
    );

    app.get(
      '/dispositivos-iot/:id',
      {
        preHandler: [...contexto, deps.autorizar('dispositivos-iot:list')],
        schema: {
          tags: ['dispositivos-iot'],
          summary: 'Busca um coletor IoT por id (com entradas e status online)',
          security: seguranca,
          params: idParam,
        },
      },
      async (request, reply) => {
        const { buscarDispositivo } = deps.montarUseCases(request.prismaTenant);
        const dto = await buscarDispositivo.executar(
          request.params.id,
          request.estabelecimentoId,
          tenantIdDe(request),
        );
        return reply.status(200).send(dto);
      },
    );

    app.post(
      '/dispositivos-iot',
      {
        preHandler: [...contexto, deps.autorizar('dispositivos-iot:create')],
        schema: {
          tags: ['dispositivos-iot'],
          summary: 'Cadastra um coletor IoT',
          security: seguranca,
          body: criarBody,
        },
      },
      async (request, reply) => {
        const { criarDispositivo } = deps.montarUseCases(request.prismaTenant);
        const dto = await criarDispositivo.executar({
          estabelecimentoId: request.estabelecimentoId,
          ...request.body,
        });
        return reply.status(201).send(dto);
      },
    );

    app.put(
      '/dispositivos-iot/:id',
      {
        preHandler: [...contexto, deps.autorizar('dispositivos-iot:update')],
        schema: {
          tags: ['dispositivos-iot'],
          summary: 'Edita um coletor IoT e a configuração de suas entradas',
          security: seguranca,
          params: idParam,
          body: editarBody,
        },
      },
      async (request, reply) => {
        const { editarDispositivo } = deps.montarUseCases(request.prismaTenant);
        const dto = await editarDispositivo.executar({
          id: request.params.id,
          tenantId: tenantIdDe(request),
          estabelecimentoId: request.estabelecimentoId,
          ...request.body,
        });
        return reply.status(200).send(dto);
      },
    );

    // Contadores do período: o "contador de peças" da tela, agregado a partir
    // das leituras que o worker gravou.
    app.get(
      '/dispositivos-iot/:id/contadores',
      {
        preHandler: [...contexto, deps.autorizar('dispositivos-iot:list')],
        schema: {
          tags: ['dispositivos-iot'],
          summary: 'Contadores das entradas de um coletor no período',
          security: seguranca,
          params: idParam,
          querystring: periodoQuery,
        },
      },
      async (request, reply) => {
        const { consultarContadores } = deps.montarUseCases(request.prismaTenant);
        const dto = await consultarContadores.executar({
          dispositivoId: request.params.id,
          estabelecimentoId: request.estabelecimentoId,
          de: request.query.de ? new Date(request.query.de) : undefined,
          ate: request.query.ate ? new Date(request.query.ate) : undefined,
        });
        return reply.status(200).send(dto);
      },
    );

    // Linha do tempo online/offline aproximada (Gantt) — derivada dos
    // timestamps de leitura, não é histórico real de conexão do broker.
    app.get(
      '/dispositivos-iot/:id/linha-do-tempo',
      {
        preHandler: [...contexto, deps.autorizar('dispositivos-iot:list')],
        schema: {
          tags: ['dispositivos-iot'],
          summary: 'Linha do tempo online/offline aproximada de um coletor no período',
          security: seguranca,
          params: idParam,
          querystring: periodoQuery,
        },
      },
      async (request, reply) => {
        const { consultarLinhaDoTempo } = deps.montarUseCases(request.prismaTenant);
        const dto = await consultarLinhaDoTempo.executar({
          dispositivoId: request.params.id,
          estabelecimentoId: request.estabelecimentoId,
          de: request.query.de ? new Date(request.query.de) : undefined,
          ate: request.query.ate ? new Date(request.query.ate) : undefined,
        });
        return reply.status(200).send(dto);
      },
    );

    app.delete(
      '/dispositivos-iot/:id',
      {
        preHandler: [...contexto, deps.autorizar('dispositivos-iot:delete')],
        schema: {
          tags: ['dispositivos-iot'],
          summary: 'Exclui um coletor IoT',
          security: seguranca,
          params: idParam,
        },
      },
      async (request, reply) => {
        const { excluirDispositivo } = deps.montarUseCases(request.prismaTenant);
        await excluirDispositivo.executar(request.params.id, request.estabelecimentoId);
        return reply.status(204).send();
      },
    );

    // Falhas do período: o contraponto dos contadores — movimentos descartados
    // na ingestão (serial desconhecido, porta não configurada, etc.).
    app.get(
      '/dispositivos-iot/:id/falhas',
      {
        preHandler: [...contexto, deps.autorizar('dispositivos-iot:list')],
        schema: {
          tags: ['dispositivos-iot'],
          summary: 'Falhas de leitura de um coletor no período',
          security: seguranca,
          params: idParam,
          querystring: periodoQuery,
        },
      },
      async (request, reply) => {
        const { consultarFalhas } = deps.montarUseCases(request.prismaTenant);
        const dto = await consultarFalhas.executar({
          dispositivoId: request.params.id,
          estabelecimentoId: request.estabelecimentoId,
          de: request.query.de ? new Date(request.query.de) : undefined,
          ate: request.query.ate ? new Date(request.query.ate) : undefined,
        });
        return reply.status(200).send(dto);
      },
    );
  };
}
