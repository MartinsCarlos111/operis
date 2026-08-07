import type { FastifyInstance, preHandlerAsyncHookHandler } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { EnviarFirmwareUseCase } from '../../application/use-cases/enviar-firmware.use-case.js';
import type { ListarFirmwaresUseCase } from '../../application/use-cases/listar-firmwares.use-case.js';
import type { SolicitarAtualizacaoFirmwareUseCase } from '../../application/use-cases/solicitar-atualizacao-firmware.use-case.js';
import type { ListarHistoricoAtualizacoesFirmwareUseCase } from '../../application/use-cases/listar-historico-atualizacoes-firmware.use-case.js';
import type { BaixarFirmwareUseCase } from '../../application/use-cases/baixar-firmware.use-case.js';

const idParam = z.object({ id: z.string().uuid() });

const modeloQuery = z.object({ modelo: z.coerce.number().int().min(0) });

const solicitarAtualizacaoBody = z.object({ firmwareId: z.string().uuid() });

const downloadParams = z.object({
  tenantId: z.string().uuid(),
  firmwareId: z.string().uuid(),
});

function tenantIdDe(request: { user?: { tenantId?: string | undefined } }): string {
  const tenantId = request.user?.tenantId;
  if (!tenantId) {
    throw new Error('tenantId ausente na request — resolverTenant deveria tê-la barrado');
  }
  return tenantId;
}

export interface FirmwareIotUseCases {
  enviarFirmware: EnviarFirmwareUseCase;
  listarFirmwares: ListarFirmwaresUseCase;
  solicitarAtualizacaoFirmware: SolicitarAtualizacaoFirmwareUseCase;
  listarHistoricoAtualizacoesFirmware: ListarHistoricoAtualizacoesFirmwareUseCase;
}

export interface FirmwareIotRoutesDeps {
  montarUseCases: (prisma: PrismaClient) => FirmwareIotUseCases;
  /**
   * Monta o use-case de download fora do contexto autenticado — a rota é
   * pública (o coletor físico não tem credenciais), então resolve o banco do
   * tenant a partir do `:tenantId` da própria URL, não de `request.prismaTenant`.
   */
  montarBaixarFirmware: (prisma: PrismaClient) => BaixarFirmwareUseCase;
  /** Resolve o PrismaClient do tenant a partir do tenantId — usado só pela rota pública. */
  resolverConexaoTenant: (tenantId: string) => Promise<PrismaClient>;
  autenticar: preHandlerAsyncHookHandler;
  resolverTenant: preHandlerAsyncHookHandler;
  exigirEstabelecimento: preHandlerAsyncHookHandler;
  autorizar: (...chaves: string[]) => preHandlerAsyncHookHandler;
}

/**
 * Adaptador HTTP de firmware IoT (migrado de
 * `CentroTrabalhoIOTController.UpdateFirmware/DownloadFirmware`). As rotas de
 * gestão (upload, disparo, histórico) exigem autenticação normal; a de
 * download é pública — replica o `[AllowAnonymous]` do legado, porque é o
 * próprio coletor físico que faz o GET, sem credenciais.
 */
export function firmwareIotRoutes(deps: FirmwareIotRoutesDeps) {
  const contexto = [deps.autenticar, deps.resolverTenant, deps.exigirEstabelecimento];
  const seguranca = [{ bearerAuth: [], estabelecimentoHeader: [] }];

  return async function plugin(fastify: FastifyInstance): Promise<void> {
    const app = fastify.withTypeProvider<ZodTypeProvider>();

    app.get(
      '/firmwares-iot',
      {
        preHandler: [...contexto, deps.autorizar('dispositivos-iot:list')],
        schema: {
          tags: ['dispositivos-iot'],
          summary: 'Lista o histórico de versões de firmware de um modelo',
          security: seguranca,
          querystring: modeloQuery,
        },
      },
      async (request, reply) => {
        const { listarFirmwares } = deps.montarUseCases(request.prismaTenant);
        const dto = await listarFirmwares.executar({
          modelo: request.query.modelo,
          estabelecimentoId: request.estabelecimentoId,
        });
        return reply.status(200).send(dto);
      },
    );

    // multipart: o binário vem como arquivo no form, "modelo"/"versao" como
    // campos de texto — @fastify/multipart precisa estar registrado no app.
    app.post(
      '/firmwares-iot',
      {
        preHandler: [...contexto, deps.autorizar('dispositivos-iot:create')],
        schema: {
          tags: ['dispositivos-iot'],
          summary: 'Envia um novo binário de firmware (multipart/form-data)',
          security: seguranca,
          consumes: ['multipart/form-data'],
        },
      },
      async (request, reply) => {
        const arquivo = await request.file();
        if (!arquivo) {
          return reply.status(400).send({ message: 'Arquivo de firmware ausente.' });
        }
        const campos = arquivo.fields as Record<string, { value?: unknown } | undefined>;
        const modelo = Number(campos.modelo?.value);
        const versao = String(campos.versao?.value ?? '');
        if (!Number.isFinite(modelo) || !versao.trim()) {
          return reply.status(400).send({ message: 'Campos "modelo" e "versao" são obrigatórios.' });
        }

        const conteudo = await arquivo.toBuffer();
        const { enviarFirmware } = deps.montarUseCases(request.prismaTenant);
        const dto = await enviarFirmware.executar({
          tenantId: tenantIdDe(request),
          estabelecimentoId: request.estabelecimentoId,
          modelo,
          versao,
          conteudo,
        });
        return reply.status(201).send(dto);
      },
    );

    app.post(
      '/dispositivos-iot/:id/atualizar-firmware',
      {
        preHandler: [...contexto, deps.autorizar('dispositivos-iot:update')],
        schema: {
          tags: ['dispositivos-iot'],
          summary: 'Dispara a atualização OTA de um coletor para um firmware já enviado',
          security: seguranca,
          params: idParam,
          body: solicitarAtualizacaoBody,
        },
      },
      async (request, reply) => {
        const { solicitarAtualizacaoFirmware } = deps.montarUseCases(request.prismaTenant);
        const dto = await solicitarAtualizacaoFirmware.executar({
          tenantId: tenantIdDe(request),
          estabelecimentoId: request.estabelecimentoId,
          dispositivoId: request.params.id,
          firmwareId: request.body.firmwareId,
        });
        return reply.status(201).send(dto);
      },
    );

    app.get(
      '/dispositivos-iot/:id/atualizacoes-firmware',
      {
        preHandler: [...contexto, deps.autorizar('dispositivos-iot:list')],
        schema: {
          tags: ['dispositivos-iot'],
          summary: 'Histórico de ciclos de atualização OTA de um coletor',
          security: seguranca,
          params: idParam,
        },
      },
      async (request, reply) => {
        const { listarHistoricoAtualizacoesFirmware } = deps.montarUseCases(request.prismaTenant);
        const dto = await listarHistoricoAtualizacoesFirmware.executar({
          dispositivoId: request.params.id,
          estabelecimentoId: request.estabelecimentoId,
        });
        return reply.status(200).send(dto);
      },
    );

    // Rota pública — sem `contexto` (sem autenticação). O coletor físico faz
    // GET direto, com o serial dele como query string (que ele mesmo anexa).
    app.get(
      '/firmware/download/:tenantId/:firmwareId',
      {
        schema: {
          tags: ['dispositivos-iot'],
          summary: 'Download público do binário de firmware (consumido pelo coletor)',
          params: downloadParams,
        },
      },
      async (request, reply) => {
        const prismaTenant = await deps.resolverConexaoTenant(request.params.tenantId);
        const baixarFirmware = deps.montarBaixarFirmware(prismaTenant);
        const conteudo = await baixarFirmware.executar({
          tenantId: request.params.tenantId,
          firmwareId: request.params.firmwareId,
        });
        return reply
          .status(200)
          .header('content-type', 'application/octet-stream')
          .header('content-length', conteudo.length)
          .send(conteudo);
      },
    );
  };
}
