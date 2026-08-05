import type { FastifyInstance, preHandlerAsyncHookHandler } from 'fastify';
import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import ExcelJS from 'exceljs';
import { StatusRecurso } from '@shared/domain/status-recurso.js';
import type {
  BuscarCalendarioUseCase,
  BuscarGrupoMaquinaUseCase,
  CriarCalendarioUseCase,
  CriarGrupoMaquinaUseCase,
  EditarCalendarioUseCase,
  EditarGrupoMaquinaUseCase,
  ExcluirCalendarioUseCase,
  ExcluirGrupoMaquinaUseCase,
  ListarCalendariosUseCase,
  ListarGruposMaquinaUseCase,
} from '../../application/use-cases/cadastros-apoio.use-cases.js';
import type {
  BuscarCentroTrabalhoUseCase,
  CriarCentroTrabalhoUseCase,
  EditarCentroTrabalhoUseCase,
  ExcluirCentroTrabalhoUseCase,
  ListarCentrosTrabalhoUseCase,
} from '../../application/use-cases/centro-trabalho.use-cases.js';
import type {
  BuscarOrdemProducaoUseCase,
  CriarOrdemProducaoUseCase,
  ListarOrdensProducaoUseCase,
} from '../../application/use-cases/ordem-producao.use-cases.js';
import type {
  BuscarTurnoUseCase,
  CriarTurnoUseCase,
  EditarTurnoUseCase,
  ExcluirTurnoUseCase,
  ListarTurnosUseCase,
} from '../../application/use-cases/turno.use-cases.js';
import type {
  BuscarReservaUseCase,
  CancelarReservaUseCase,
  CriarReservaUseCase,
  EditarReservaUseCase,
  ListarReservasUseCase,
} from '../../application/use-cases/reserva.use-cases.js';
import type {
  BuscarMovimentoUseCase,
  CancelarMovimentoUseCase,
  ListarMovimentosUseCase,
  RegistrarMovimentoUseCase,
  ReintegrarMovimentoUseCase,
} from '../../application/use-cases/movimento.use-cases.js';


const statusSchema = z.nativeEnum(StatusRecurso);
const idParam = z.object({ id: z.string().uuid() });

/** Query paginada — mesma forma de Áreas (ex-startIndex/maxRows/jsonConditions). */
const listarQuery = z.object({
  startIndex: z.coerce.number().int().min(0).default(0),
  maxRows: z.coerce.number().int().min(1).max(500).default(50),
  termo: z.string().trim().min(1).optional(),
});

const calendarioBody = z.object({
  codigo: z.string().min(1),
  descricao: z.string().min(1),
  status: statusSchema.optional(),
});

/**
 * Turno: horas como minutos desde a meia-noite (0..1439) — ver a divergência
 * documentada no schema. `diasSemana` não pode ser vazio (TurnoRN).
 */
const turnoBody = z.object({
  codigo: z.string().min(1),
  descricao: z.string().min(1),
  calendarioId: z.string().uuid(),
  inicioMinutos: z.number().int().min(0).max(1439),
  fimMinutos: z.number().int().min(0).max(1439),
  tempoTotalMinutos: z.number().int().positive(),
  tempoDisponivelMinutos: z.number().int().positive(),
  diasSemana: z
    .array(z.enum(['DOMINGO', 'SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO']))
    .min(1, 'Selecione ao menos um dia da semana.'),
  util: z.boolean().optional(),
  observacao: z.string().nullable().optional(),
  status: statusSchema.optional(),
});

const listarTurnosQuery = listarQuery.extend({ calendarioId: z.string().uuid().optional() });

/**
 * Reserva. `status` NÃO entra no body: é derivado de `quantidadeRequisitada`
 * pela entidade, e CANCELADA só pela rota de cancelamento (regra do ReservaRN).
 */
const reservaBody = z.object({
  ordemProducaoId: z.string().uuid(),
  sequencia: z.number().int().min(1),
  itemCodigo: z.string().min(1),
  itemDescricao: z.string().min(1),
  lote: z.string().nullable().optional(),
  unidadeMedida: z.string().nullable().optional(),
  quantidadeReserva: z.number().min(0).optional(),
  quantidadeRequisitada: z.number().min(0).optional(),
  quantidadeDevolvida: z.number().min(0).optional(),
  requisicaoTerminal: z.boolean().optional(),
});

const listarReservasQuery = listarQuery.extend({
  ordemProducaoId: z.string().uuid().optional(),
});

const TIPOS_MOVIMENTO = [
  'PREPARACAO', 'REPORTE', 'REFUGO', 'PARADA', 'TROCA_FERRAMENTAL', 'TROCA_TURNO',
  'RECUSA', 'ALERTA', 'HISTORICO', 'ESTORNO', 'REQUISICAO', 'DEVOLUCAO', 'CONSUMO_LOTE',
] as const;

/**
 * Movimento. As classificações vão por CÓDIGO, não por id — é assim que o
 * terminal as conhece, e é o que habilita o autocadastro do legado.
 * `cancelado`/`dataIntegracao` não entram: são resultado de operação, não input.
 */
const movimentoBody = z.object({
  tipo: z.enum(TIPOS_MOVIMENTO),
  centroTrabalhoId: z.string().uuid(),
  usuarioId: z.string().uuid(),
  operador: z.string().min(1),
  turnoId: z.string().uuid(),
  ordemProducaoId: z.string().uuid().nullable().optional(),
  reservaId: z.string().uuid().nullable().optional(),
  dataTurno: z.coerce.date().optional(),
  inicio: z.coerce.date().optional(),
  fim: z.coerce.date().nullable().optional(),
  consideraOee: z.boolean().optional(),
  quantidades: z
    .object({
      unidade: z.number().nullable().optional(),
      metragem: z.number().nullable().optional(),
      peso: z.number().nullable().optional(),
      area: z.number().nullable().optional(),
      volume: z.number().nullable().optional(),
      especifica: z.number().nullable().optional(),
    })
    .optional(),
  tipoParadaCodigo: z.string().nullable().optional(),
  tipoRefugoCodigo: z.string().nullable().optional(),
  tipoCausaCodigo: z.string().nullable().optional(),
  tipoRecusaCodigo: z.string().nullable().optional(),
  manutencao: z
    .object({
      tecnicoManutencao: z.string().nullable().optional(),
      ordemManutencao: z.string().nullable().optional(),
      fimSolicitacao: z.coerce.date().nullable().optional(),
      fimManutencao: z.coerce.date().nullable().optional(),
      descricaoCausa: z.string().nullable().optional(),
    })
    .optional(),
  reportaErp: z.boolean().optional(),
  observacao: z.string().nullable().optional(),
});

const listarMovimentosQuery = listarQuery.extend({
  centroTrabalhoId: z.string().uuid().optional(),
  ordemProducaoId: z.string().uuid().optional(),
  tipo: z.enum(TIPOS_MOVIMENTO).optional(),
});

const cancelarMovimentoBody = z.object({
  observacao: z.string().optional(),
  usuarioCancelamentoId: z.string().uuid().optional(),
});

const grupoMaquinaBody = z.object({
  codigo: z.string().min(1),
  descricao: z.string().min(1),
  regraDespacho: z
    .enum(['MENOR_OPERACAO', 'DATA_ENTREGA', 'PRIORIDADE', 'CODIGO_REDUTOR'])
    .optional(),
  status: statusSchema.optional(),
});

const centroTrabalhoBody = z.object({
  codigo: z.string().min(1),
  descricao: z.string().min(1),
  status: statusSchema.optional(),
  calendarioId: z.string().uuid(),
  vinculos: z
    .object({
      grupoMaquinaId: z.string().uuid().nullable().optional(),
      tipoCausaId: z.string().uuid().nullable().optional(),
      tipoParadaId: z.string().uuid().nullable().optional(),
      tipoRecusaId: z.string().uuid().nullable().optional(),
      tipoRefugoId: z.string().uuid().nullable().optional(),
    })
    .optional(),
  parametros: z
    .object({
      controlaMaoObra: z.boolean().optional(),
      preparacao: z.boolean().optional(),
      operacaoBaixada: z.number().int().nullable().optional(),
      tempoParadaPadraoMinutos: z.number().int().min(0).optional(),
      tratamentoTempo: z.enum(['FIXO', 'PROPORCIONAL', 'FERRAMENTAL', 'LOTE']).optional(),
      tratamentoTempoLote: z.number().nullable().optional(),
      tipoUnidadeMedida: z
        .enum(['UNIDADE', 'METRAGEM', 'PESO', 'AREA', 'VOLUME', 'ESPECIFICA'])
        .optional(),
    })
    .optional(),
  metas: z
    .object({
      metaDispTurno: z.number().min(0).max(100).nullable().optional(),
      metaDesempTurno: z.number().min(0).max(100).nullable().optional(),
      metaQualiTurno: z.number().min(0).max(100).nullable().optional(),
      metaOeeTurno: z.number().min(0).max(100).nullable().optional(),
      // O RN recusa negativo; o schema já barra antes de chegar ao domínio.
      custoMaquinaHora: z.number().min(0).optional(),
    })
    .optional(),
});

const ordemProducaoBody = z.object({
  codigo: z.string().min(1),
  identificador: z.string().min(1),
  itemCodigo: z.string().min(1),
  itemDescricao: z.string().nullable().optional(),
  quantidadePlanejada: z.number().positive(),
  unidadeMedida: z.enum(['UNIDADE', 'METRAGEM', 'PESO', 'AREA', 'VOLUME', 'ESPECIFICA']).optional(),
  centroTrabalhoId: z.string().uuid().nullable().optional(),
  grupoMaquinaId: z.string().uuid().nullable().optional(),
  centroTrabalhoValido: z.string().nullable().optional(),
  prioridade: z.number().int().optional(),
  prioridadeCodigoRedutor: z.number().int().optional(),
  sequencia: z.number().int().optional(),
  modoDistribuicao: z.enum(['PUXADA', 'EMPURRADA']).optional(),
  status: z.enum(['LIBERADA', 'NAO_LIBERADA', 'INICIADA', 'CONGELADA', 'RECUSADA', 'CONCLUIDA', 'CANCELADA', 'BAIXADA']).optional(),
  cliente: z.string().nullable().optional(),
  pedido: z.string().nullable().optional(),
  observacoes: z.string().nullable().optional(),
  liberacaoEm: z.string().datetime().nullable().optional(),
  inicioPlanejado: z.string().datetime().nullable().optional(),
  fimPlanejado: z.string().datetime().nullable().optional(),
  encerraEm: z.string().datetime().nullable().optional(),
  planoProducaoId: z.string().uuid().nullable().optional(),
  ordemPaiId: z.string().uuid().nullable().optional(),
  ordemSequenciaId: z.string().uuid().nullable().optional(),
});
const planoProducaoBody = z.object({
  codigo: z.string().min(1), descricao: z.string().min(1), itemCodigo: z.string().min(1),
  itemDescricao: z.string().nullable().optional(), quantidade: z.number().positive(),
  unidadeMedida: z.enum(['UNIDADE', 'METRAGEM', 'PESO', 'AREA', 'VOLUME', 'ESPECIFICA']).optional(),
  centroTrabalhoId: z.string().uuid().nullable().optional(), grupoMaquinaId: z.string().uuid().nullable().optional(),
  inicioPlanejado: z.string().datetime().nullable().optional(), fimPlanejado: z.string().datetime().nullable().optional(),
});
const artigoBody = z.object({ codigo: z.string().trim().min(1), descricao: z.string().trim().min(1), qualidades: z.string().nullable().optional(), status: statusSchema.optional() });
const artigoCentroBody = z.object({
  artigoId: z.string().uuid(), centroTrabalhoId: z.string().uuid(),
  cicloProdutivoHora: z.number().min(0).optional(), cicloProdutivoPecaSegundos: z.number().min(0).optional(),
  tempoPreparacaoSegundos: z.number().min(0).optional(), fatorRefugo: z.number().min(0).optional(),
  quantidadeRefugo: z.number().min(0).optional(), quantidadePerda: z.number().min(0).optional(),
  apontarPreparacao: z.number().min(0).optional(), tempoMaquinaSegundos: z.number().min(0).optional(),
  loteMultiplo: z.number().min(0).optional(), ativo: z.boolean().optional(),
});
const cicloQuery = listarQuery.extend({
  artigoCodigo: z.string().trim().min(1).optional(),
  centroCodigo: z.string().trim().min(1).optional(),
  ativo: z.enum(['true', 'false']).optional(),
});
const configuracaoCamposQuery = z.object({ tela: z.string().trim().min(1) });
const configuracaoCamposBody = z.object({
  tela: z.string().trim().min(1),
  campos: z.array(z.object({ campo: z.string().trim().min(1), visivel: z.boolean(), ordem: z.number().int().min(0) })),
});
const importacaoXlsxBody = z.object({ arquivoBase64: z.string().min(1) });
const PERMISSOES_ARTIGOS = {
  acesso: 'manufatura:artigos-ciclos:acesso',
  adicionar: 'manufatura:artigos-ciclos:adicionar',
  editar: 'manufatura:artigos-ciclos:editar',
  excluir: 'manufatura:artigos-ciclos:excluir',
  importar: 'manufatura:artigos-ciclos:importar',
  exportar: 'manufatura:artigos-ciclos:exportar',
  configuracao: 'manufatura:artigos-ciclos:configuracao-campos',
} as const;
const CAMPOS_ARTIGOS_CICLOS = ['artigo', 'centro', 'hora', 'peca', 'preparacao', 'maquina', 'ativo'] as const;

export interface ManufaturaUseCases {
  criarCalendario: CriarCalendarioUseCase;
  editarCalendario: EditarCalendarioUseCase;
  excluirCalendario: ExcluirCalendarioUseCase;
  buscarCalendario: BuscarCalendarioUseCase;
  listarCalendarios: ListarCalendariosUseCase;

  criarGrupoMaquina: CriarGrupoMaquinaUseCase;
  editarGrupoMaquina: EditarGrupoMaquinaUseCase;
  excluirGrupoMaquina: ExcluirGrupoMaquinaUseCase;
  buscarGrupoMaquina: BuscarGrupoMaquinaUseCase;
  listarGruposMaquina: ListarGruposMaquinaUseCase;

  criarCentroTrabalho: CriarCentroTrabalhoUseCase;
  editarCentroTrabalho: EditarCentroTrabalhoUseCase;
  excluirCentroTrabalho: ExcluirCentroTrabalhoUseCase;
  buscarCentroTrabalho: BuscarCentroTrabalhoUseCase;
  listarCentrosTrabalho: ListarCentrosTrabalhoUseCase;
  criarOrdemProducao: CriarOrdemProducaoUseCase;
  buscarOrdemProducao: BuscarOrdemProducaoUseCase;
  listarOrdensProducao: ListarOrdensProducaoUseCase;

  criarTurno: CriarTurnoUseCase;
  editarTurno: EditarTurnoUseCase;
  excluirTurno: ExcluirTurnoUseCase;
  buscarTurno: BuscarTurnoUseCase;
  listarTurnos: ListarTurnosUseCase;

  criarReserva: CriarReservaUseCase;
  editarReserva: EditarReservaUseCase;
  cancelarReserva: CancelarReservaUseCase;
  buscarReserva: BuscarReservaUseCase;
  listarReservas: ListarReservasUseCase;

  registrarMovimento: RegistrarMovimentoUseCase;
  cancelarMovimento: CancelarMovimentoUseCase;
  reintegrarMovimento: ReintegrarMovimentoUseCase;
  buscarMovimento: BuscarMovimentoUseCase;
  listarMovimentos: ListarMovimentosUseCase;
}

export interface ManufaturaRoutesDeps {
  montarUseCases: (prisma: PrismaClient) => ManufaturaUseCases;
  autenticar: preHandlerAsyncHookHandler;
  resolverTenant: preHandlerAsyncHookHandler;
  exigirEstabelecimento: preHandlerAsyncHookHandler;
  autorizar: (...chaves: string[]) => preHandlerAsyncHookHandler;
}

/**
 * Adaptador HTTP dos cadastros de manufatura (Calendário, Grupo de Máquina e
 * Centro de Trabalho). Toda rota roda no estabelecimento ativo
 * (x-estabelecimento-id) e as mutações exigem a permissão correspondente —
 * paridade com os [Permission("...")] dos controllers legados.
 */
export function manufaturaRoutes(deps: ManufaturaRoutesDeps) {
  const contexto = [deps.autenticar, deps.resolverTenant, deps.exigirEstabelecimento];
  const seguranca = [{ bearerAuth: [], estabelecimentoHeader: [] }];

  return async function plugin(fastify: FastifyInstance): Promise<void> {
    const app = fastify.withTypeProvider<ZodTypeProvider>();

    // ------------------------------------------------------------ Calendários
    app.get(
      '/manufatura/calendarios',
      {
        preHandler: [...contexto, deps.autorizar('manufatura:list')],
        schema: {
          tags: ['manufatura'],
          summary: 'Lista os calendários do estabelecimento ativo (paginado)',
          security: seguranca,
          querystring: listarQuery,
        },
      },
      async (request, reply) => {
        const { listarCalendarios } = deps.montarUseCases(request.prismaTenant);
        return reply.status(200).send(
          await listarCalendarios.executar({
            estabelecimentoId: request.estabelecimentoId,
            ...request.query,
          }),
        );
      },
    );

    app.get(
      '/manufatura/calendarios/:id',
      {
        preHandler: [...contexto, deps.autorizar('manufatura:list')],
        schema: {
          tags: ['manufatura'],
          summary: 'Busca um calendário por id',
          security: seguranca,
          params: idParam,
        },
      },
      async (request, reply) => {
        const { buscarCalendario } = deps.montarUseCases(request.prismaTenant);
        return reply.status(200).send(
          await buscarCalendario.executar({
            idCalendario: request.params.id,
            estabelecimentoId: request.estabelecimentoId,
          }),
        );
      },
    );

    app.post(
      '/manufatura/calendarios',
      {
        preHandler: [...contexto, deps.autorizar('manufatura:create')],
        schema: {
          tags: ['manufatura'],
          summary: 'Cria um calendário',
          security: seguranca,
          body: calendarioBody,
        },
      },
      async (request, reply) => {
        const { criarCalendario } = deps.montarUseCases(request.prismaTenant);
        return reply.status(201).send(
          await criarCalendario.executar({
            estabelecimentoId: request.estabelecimentoId,
            ...request.body,
          }),
        );
      },
    );

    app.put(
      '/manufatura/calendarios/:id',
      {
        preHandler: [...contexto, deps.autorizar('manufatura:update')],
        schema: {
          tags: ['manufatura'],
          summary: 'Edita um calendário',
          security: seguranca,
          params: idParam,
          body: calendarioBody,
        },
      },
      async (request, reply) => {
        const { editarCalendario } = deps.montarUseCases(request.prismaTenant);
        return reply.status(200).send(
          await editarCalendario.executar({
            idCalendario: request.params.id,
            estabelecimentoId: request.estabelecimentoId,
            ...request.body,
          }),
        );
      },
    );

    app.delete(
      '/manufatura/calendarios/:id',
      {
        preHandler: [...contexto, deps.autorizar('manufatura:delete')],
        schema: {
          tags: ['manufatura'],
          summary: 'Exclui um calendário (bloqueado se houver centros de trabalho)',
          security: seguranca,
          params: idParam,
        },
      },
      async (request, reply) => {
        const { excluirCalendario } = deps.montarUseCases(request.prismaTenant);
        await excluirCalendario.executar({
          idCalendario: request.params.id,
          estabelecimentoId: request.estabelecimentoId,
        });
        return reply.status(204).send();
      },
    );

    // ------------------------------------------------------ Grupos de máquina
    app.get(
      '/manufatura/grupos-maquina',
      {
        preHandler: [...contexto, deps.autorizar('manufatura:list')],
        schema: {
          tags: ['manufatura'],
          summary: 'Lista os grupos de máquina do estabelecimento ativo (paginado)',
          security: seguranca,
          querystring: listarQuery,
        },
      },
      async (request, reply) => {
        const { listarGruposMaquina } = deps.montarUseCases(request.prismaTenant);
        return reply.status(200).send(
          await listarGruposMaquina.executar({
            estabelecimentoId: request.estabelecimentoId,
            ...request.query,
          }),
        );
      },
    );

    app.get(
      '/manufatura/grupos-maquina/:id',
      {
        preHandler: [...contexto, deps.autorizar('manufatura:list')],
        schema: {
          tags: ['manufatura'],
          summary: 'Busca um grupo de máquina por id',
          security: seguranca,
          params: idParam,
        },
      },
      async (request, reply) => {
        const { buscarGrupoMaquina } = deps.montarUseCases(request.prismaTenant);
        return reply.status(200).send(
          await buscarGrupoMaquina.executar({
            idGrupoMaquina: request.params.id,
            estabelecimentoId: request.estabelecimentoId,
          }),
        );
      },
    );

    app.post(
      '/manufatura/grupos-maquina',
      {
        preHandler: [...contexto, deps.autorizar('manufatura:create')],
        schema: {
          tags: ['manufatura'],
          summary: 'Cria um grupo de máquina',
          security: seguranca,
          body: grupoMaquinaBody,
        },
      },
      async (request, reply) => {
        const { criarGrupoMaquina } = deps.montarUseCases(request.prismaTenant);
        return reply.status(201).send(
          await criarGrupoMaquina.executar({
            estabelecimentoId: request.estabelecimentoId,
            ...request.body,
          }),
        );
      },
    );

    app.put(
      '/manufatura/grupos-maquina/:id',
      {
        preHandler: [...contexto, deps.autorizar('manufatura:update')],
        schema: {
          tags: ['manufatura'],
          summary: 'Edita um grupo de máquina',
          security: seguranca,
          params: idParam,
          body: grupoMaquinaBody,
        },
      },
      async (request, reply) => {
        const { editarGrupoMaquina } = deps.montarUseCases(request.prismaTenant);
        return reply.status(200).send(
          await editarGrupoMaquina.executar({
            idGrupoMaquina: request.params.id,
            estabelecimentoId: request.estabelecimentoId,
            ...request.body,
          }),
        );
      },
    );

    app.delete(
      '/manufatura/grupos-maquina/:id',
      {
        preHandler: [...contexto, deps.autorizar('manufatura:delete')],
        schema: {
          tags: ['manufatura'],
          summary: 'Exclui um grupo de máquina (bloqueado se houver centros de trabalho)',
          security: seguranca,
          params: idParam,
        },
      },
      async (request, reply) => {
        const { excluirGrupoMaquina } = deps.montarUseCases(request.prismaTenant);
        await excluirGrupoMaquina.executar({
          idGrupoMaquina: request.params.id,
          estabelecimentoId: request.estabelecimentoId,
        });
        return reply.status(204).send();
      },
    );

    // ------------------------------------------------------ Centros de trabalho
    app.get(
      '/manufatura/centros-trabalho',
      {
        preHandler: [...contexto, deps.autorizar('manufatura:list')],
        schema: {
          tags: ['manufatura'],
          summary: 'Lista os centros de trabalho do estabelecimento ativo (paginado)',
          security: seguranca,
          querystring: listarQuery,
        },
      },
      async (request, reply) => {
        const { listarCentrosTrabalho } = deps.montarUseCases(request.prismaTenant);
        return reply.status(200).send(
          await listarCentrosTrabalho.executar({
            estabelecimentoId: request.estabelecimentoId,
            ...request.query,
          }),
        );
      },
    );

    app.get(
      '/manufatura/centros-trabalho/:id',
      {
        preHandler: [...contexto, deps.autorizar('manufatura:list')],
        schema: {
          tags: ['manufatura'],
          summary: 'Busca um centro de trabalho por id',
          security: seguranca,
          params: idParam,
        },
      },
      async (request, reply) => {
        const { buscarCentroTrabalho } = deps.montarUseCases(request.prismaTenant);
        return reply.status(200).send(
          await buscarCentroTrabalho.executar({
            idCentroTrabalho: request.params.id,
            estabelecimentoId: request.estabelecimentoId,
          }),
        );
      },
    );

    app.post(
      '/manufatura/centros-trabalho',
      {
        preHandler: [...contexto, deps.autorizar('manufatura:create')],
        schema: {
          tags: ['manufatura'],
          summary: 'Cria um centro de trabalho',
          security: seguranca,
          body: centroTrabalhoBody,
        },
      },
      async (request, reply) => {
        const { criarCentroTrabalho } = deps.montarUseCases(request.prismaTenant);
        return reply.status(201).send(
          await criarCentroTrabalho.executar({
            estabelecimentoId: request.estabelecimentoId,
            ...request.body,
          }),
        );
      },
    );

    app.put(
      '/manufatura/centros-trabalho/:id',
      {
        preHandler: [...contexto, deps.autorizar('manufatura:update')],
        schema: {
          tags: ['manufatura'],
          summary: 'Edita um centro de trabalho',
          security: seguranca,
          params: idParam,
          body: centroTrabalhoBody,
        },
      },
      async (request, reply) => {
        const { editarCentroTrabalho } = deps.montarUseCases(request.prismaTenant);
        return reply.status(200).send(
          await editarCentroTrabalho.executar({
            idCentroTrabalho: request.params.id,
            estabelecimentoId: request.estabelecimentoId,
            ...request.body,
          }),
        );
      },
    );

    app.delete(
      '/manufatura/centros-trabalho/:id',
      {
        preHandler: [...contexto, deps.autorizar('manufatura:delete')],
        schema: {
          tags: ['manufatura'],
          summary: 'Exclui um centro de trabalho',
          security: seguranca,
          params: idParam,
        },
      },
      async (request, reply) => {
        const { excluirCentroTrabalho } = deps.montarUseCases(request.prismaTenant);
        await excluirCentroTrabalho.executar({
          idCentroTrabalho: request.params.id,
          estabelecimentoId: request.estabelecimentoId,
        });
        return reply.status(204).send();
      },
    );

    // --------------------------------------------------------- Ordens de producao
    // --------------------------------------------------------- Artigos e ciclos por centro
    app.get('/manufatura/artigos', { preHandler: [...contexto, deps.autorizar(PERMISSOES_ARTIGOS.acesso)], schema: { tags: ['manufatura'], security: seguranca, querystring: listarQuery } }, async (request, reply) => {
      const where = { estabelecimentoId: request.estabelecimentoId, ...(request.query.termo ? { OR: [{ codigo: { contains: request.query.termo, mode: 'insensitive' as const } }, { descricao: { contains: request.query.termo, mode: 'insensitive' as const } }] } : {}) };
      const [model, count] = await Promise.all([request.prismaTenant.artigo.findMany({ where, orderBy: { codigo: 'asc' }, skip: request.query.startIndex, take: request.query.maxRows }), request.prismaTenant.artigo.count({ where })]);
      return reply.status(200).send({ count, model });
    });
    app.post('/manufatura/artigos', { preHandler: [...contexto, deps.autorizar(PERMISSOES_ARTIGOS.adicionar)], schema: { tags: ['manufatura'], security: seguranca, body: artigoBody } }, async (request, reply) => {
      const artigo = await request.prismaTenant.artigo.create({ data: { estabelecimentoId: request.estabelecimentoId, ...request.body } as Prisma.ArtigoUncheckedCreateInput });
      return reply.status(201).send(artigo);
    });
    app.put('/manufatura/artigos/:id', { preHandler: [...contexto, deps.autorizar(PERMISSOES_ARTIGOS.editar)], schema: { tags: ['manufatura'], security: seguranca, params: idParam, body: artigoBody } }, async (request, reply) => {
      const artigo = await request.prismaTenant.artigo.findFirst({ where: { idArtigo: request.params.id, estabelecimentoId: request.estabelecimentoId } });
      if (!artigo) return reply.status(404).send({ message: 'Artigo não encontrado.' });
      return reply.status(200).send(await request.prismaTenant.artigo.update({ where: { idArtigo: artigo.idArtigo }, data: request.body as Prisma.ArtigoUncheckedUpdateInput }));
    });
    app.delete('/manufatura/artigos/:id', { preHandler: [...contexto, deps.autorizar(PERMISSOES_ARTIGOS.excluir)], schema: { tags: ['manufatura'], security: seguranca, params: idParam } }, async (request, reply) => {
      const artigo = await request.prismaTenant.artigo.findFirst({ where: { idArtigo: request.params.id, estabelecimentoId: request.estabelecimentoId } });
      if (!artigo) return reply.status(404).send({ message: 'Artigo não encontrado.' });
      await request.prismaTenant.artigo.delete({ where: { idArtigo: artigo.idArtigo } });
      return reply.status(204).send();
    });
    app.get('/manufatura/artigos-centros-trabalho', { preHandler: [...contexto, deps.autorizar(PERMISSOES_ARTIGOS.acesso)], schema: { tags: ['manufatura'], security: seguranca, querystring: cicloQuery } }, async (request, reply) => {
      const termo = request.query.termo;
      const where = { artigo: { estabelecimentoId: request.estabelecimentoId, ...(request.query.artigoCodigo ? { codigo: { contains: request.query.artigoCodigo, mode: 'insensitive' as const } } : {}), ...(termo ? { OR: [{ codigo: { contains: termo, mode: 'insensitive' as const } }, { descricao: { contains: termo, mode: 'insensitive' as const } }] } : {}) }, centroTrabalho: { estabelecimentoId: request.estabelecimentoId, ...(request.query.centroCodigo ? { codigo: { contains: request.query.centroCodigo, mode: 'insensitive' as const } } : {}) }, ...(request.query.ativo ? { ativo: request.query.ativo === 'true' } : {}) };
      const [model, count] = await Promise.all([request.prismaTenant.artigoCentroTrabalho.findMany({ where, include: { artigo: true, centroTrabalho: true }, orderBy: { criadoEm: 'desc' }, skip: request.query.startIndex, take: request.query.maxRows }), request.prismaTenant.artigoCentroTrabalho.count({ where })]);
      return reply.status(200).send({ count, model });
    });
    app.get('/manufatura/artigos-centros-trabalho/export', { preHandler: [...contexto, deps.autorizar(PERMISSOES_ARTIGOS.exportar)], schema: { tags: ['manufatura'], security: seguranca, querystring: cicloQuery } }, async (request, reply) => {
      const termo = request.query.termo;
      const where = { artigo: { estabelecimentoId: request.estabelecimentoId, ...(request.query.artigoCodigo ? { codigo: { contains: request.query.artigoCodigo, mode: 'insensitive' as const } } : {}), ...(termo ? { OR: [{ codigo: { contains: termo, mode: 'insensitive' as const } }, { descricao: { contains: termo, mode: 'insensitive' as const } }] } : {}) }, centroTrabalho: { estabelecimentoId: request.estabelecimentoId, ...(request.query.centroCodigo ? { codigo: { contains: request.query.centroCodigo, mode: 'insensitive' as const } } : {}) }, ...(request.query.ativo ? { ativo: request.query.ativo === 'true' } : {}) };
      const rows = await request.prismaTenant.artigoCentroTrabalho.findMany({ where, include: { artigo: true, centroTrabalho: true }, orderBy: { criadoEm: 'desc' } });
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Artigos e ciclos');
      sheet.columns = [
        { header: 'artigoCodigo', key: 'artigoCodigo', width: 18 }, { header: 'centroCodigo', key: 'centroCodigo', width: 18 },
        { header: 'cicloProdutivoHora', key: 'cicloProdutivoHora', width: 20 }, { header: 'cicloProdutivoPecaSegundos', key: 'cicloProdutivoPecaSegundos', width: 24 },
        { header: 'tempoPreparacaoSegundos', key: 'tempoPreparacaoSegundos', width: 24 }, { header: 'fatorRefugo', key: 'fatorRefugo', width: 14 },
        { header: 'quantidadeRefugo', key: 'quantidadeRefugo', width: 18 }, { header: 'quantidadePerda', key: 'quantidadePerda', width: 18 },
        { header: 'apontarPreparacao', key: 'apontarPreparacao', width: 18 }, { header: 'tempoMaquinaSegundos', key: 'tempoMaquinaSegundos', width: 22 },
        { header: 'loteMultiplo', key: 'loteMultiplo', width: 14 }, { header: 'ativo', key: 'ativo', width: 10 },
      ];
      for (const row of rows) sheet.addRow({ artigoCodigo: row.artigo.codigo, centroCodigo: row.centroTrabalho.codigo, ...row });
      const buffer = await workbook.xlsx.writeBuffer();
      return reply.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').header('content-disposition', 'attachment; filename="artigos-centros-trabalho.xlsx"').send(Buffer.from(buffer));
    });
    app.post('/manufatura/artigos-centros-trabalho/import', { preHandler: [...contexto, deps.autorizar(PERMISSOES_ARTIGOS.importar)], schema: { tags: ['manufatura'], security: seguranca, body: importacaoXlsxBody } }, async (request, reply) => {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(Buffer.from(request.body.arquivoBase64, 'base64') as never);
      const sheet = workbook.worksheets[0];
      if (!sheet) return reply.status(422).send({ message: 'A planilha não possui uma aba válida.' });
      const headers = (sheet.getRow(1).values as unknown[]).slice(1).map((value) => String(value ?? '').trim());
      const index = new Map(headers.map((header, position) => [header, position + 1]));
      const texto = (row: ExcelJS.Row, key: string) => String(row.getCell(index.get(key) ?? 0).value ?? '').trim();
      const numero = (row: ExcelJS.Row, key: string) => Number(texto(row, key).replace(',', '.') || 0);
      const erros: { linha: number; mensagem: string }[] = [];
      let importados = 0;
      for (let linha = 2; linha <= sheet.rowCount; linha += 1) {
        const row = sheet.getRow(linha);
        if (row.cellCount === 0) continue;
        try {
          const artigoCodigo = texto(row, 'artigoCodigo');
          const centroCodigo = texto(row, 'centroCodigo');
          if (!artigoCodigo || !centroCodigo) throw new Error('artigoCodigo e centroCodigo são obrigatórios.');
          const [artigo, centro] = await Promise.all([
            request.prismaTenant.artigo.findFirst({ where: { estabelecimentoId: request.estabelecimentoId, codigo: artigoCodigo } }),
            request.prismaTenant.centroTrabalho.findFirst({ where: { estabelecimentoId: request.estabelecimentoId, codigo: centroCodigo } }),
          ]);
          if (!artigo) throw new Error(`Artigo "${artigoCodigo}" não encontrado.`);
          if (!centro) throw new Error(`Centro de trabalho "${centroCodigo}" não encontrado.`);
          if (centro.status !== 'ATIVO') throw new Error(`Centro de trabalho "${centroCodigo}" está inativo.`);
          await request.prismaTenant.artigoCentroTrabalho.upsert({
            where: { artigoId_centroTrabalhoId: { artigoId: artigo.idArtigo, centroTrabalhoId: centro.idCentroTrabalho } },
            create: { artigoId: artigo.idArtigo, centroTrabalhoId: centro.idCentroTrabalho, cicloProdutivoHora: numero(row, 'cicloProdutivoHora'), cicloProdutivoPecaSegundos: numero(row, 'cicloProdutivoPecaSegundos'), tempoPreparacaoSegundos: numero(row, 'tempoPreparacaoSegundos'), fatorRefugo: numero(row, 'fatorRefugo'), quantidadeRefugo: numero(row, 'quantidadeRefugo'), quantidadePerda: numero(row, 'quantidadePerda'), apontarPreparacao: numero(row, 'apontarPreparacao'), tempoMaquinaSegundos: numero(row, 'tempoMaquinaSegundos'), loteMultiplo: numero(row, 'loteMultiplo'), ativo: texto(row, 'ativo') !== 'false' },
            update: { cicloProdutivoHora: numero(row, 'cicloProdutivoHora'), cicloProdutivoPecaSegundos: numero(row, 'cicloProdutivoPecaSegundos'), tempoPreparacaoSegundos: numero(row, 'tempoPreparacaoSegundos'), fatorRefugo: numero(row, 'fatorRefugo'), quantidadeRefugo: numero(row, 'quantidadeRefugo'), quantidadePerda: numero(row, 'quantidadePerda'), apontarPreparacao: numero(row, 'apontarPreparacao'), tempoMaquinaSegundos: numero(row, 'tempoMaquinaSegundos'), loteMultiplo: numero(row, 'loteMultiplo'), ativo: texto(row, 'ativo') !== 'false' },
          });
          importados += 1;
        } catch (error) { erros.push({ linha, mensagem: error instanceof Error ? error.message : 'Linha inválida.' }); }
      }
      return reply.status(200).send({ importados, erros });
    });
    app.get('/manufatura/configuracao-campos', { preHandler: [...contexto, deps.autorizar(PERMISSOES_ARTIGOS.configuracao)], schema: { tags: ['manufatura'], security: seguranca, querystring: configuracaoCamposQuery } }, async (request, reply) => {
      const existentes = await request.prismaTenant.$queryRaw<{ campo: string; visivel: boolean; ordem: number }[]>(Prisma.sql`SELECT campo, visivel, ordem FROM configuracoes_campos WHERE estabelecimento_id = ${request.estabelecimentoId} AND tela = ${request.query.tela} ORDER BY ordem ASC`);
      const porCampo = new Map(existentes.map((campo) => [campo.campo, campo]));
      return reply.send({ model: CAMPOS_ARTIGOS_CICLOS.map((campo, ordem) => porCampo.get(campo) ?? { campo, ordem, visivel: true }) });
    });
    app.put('/manufatura/configuracao-campos', { preHandler: [...contexto, deps.autorizar(PERMISSOES_ARTIGOS.configuracao)], schema: { tags: ['manufatura'], security: seguranca, body: configuracaoCamposBody } }, async (request, reply) => {
      await request.prismaTenant.$transaction(async (tx) => {
        for (const campo of request.body.campos) {
          await tx.$executeRaw(Prisma.sql`INSERT INTO configuracoes_campos ("idConfiguracaoCampo", estabelecimento_id, tela, campo, visivel, ordem, criado_em, atualizado_em) VALUES (gen_random_uuid(), ${request.estabelecimentoId}, ${request.body.tela}, ${campo.campo}, ${campo.visivel}, ${campo.ordem}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT (estabelecimento_id, tela, campo) DO UPDATE SET visivel = EXCLUDED.visivel, ordem = EXCLUDED.ordem, atualizado_em = CURRENT_TIMESTAMP`);
        }
      });
      return reply.send({ ok: true });
    });
    app.post('/manufatura/artigos-centros-trabalho', { preHandler: [...contexto, deps.autorizar(PERMISSOES_ARTIGOS.adicionar)], schema: { tags: ['manufatura'], security: seguranca, body: artigoCentroBody } }, async (request, reply) => {
      const [artigo, centro] = await Promise.all([request.prismaTenant.artigo.findFirst({ where: { idArtigo: request.body.artigoId, estabelecimentoId: request.estabelecimentoId } }), request.prismaTenant.centroTrabalho.findFirst({ where: { idCentroTrabalho: request.body.centroTrabalhoId, estabelecimentoId: request.estabelecimentoId } })]);
      if (!artigo) return reply.status(422).send({ message: 'Artigo inexistente.' });
      if (!centro) return reply.status(422).send({ message: 'Centro de trabalho inexistente.' });
      if (centro.status !== 'ATIVO') return reply.status(422).send({ message: 'Centro de trabalho inativo.' });
      const { artigoId, centroTrabalhoId, ...valores } = request.body;
      return reply.status(201).send(await request.prismaTenant.artigoCentroTrabalho.create({ data: { artigoId, centroTrabalhoId, ...valores } as Prisma.ArtigoCentroTrabalhoUncheckedCreateInput }));
    });
    app.put('/manufatura/artigos-centros-trabalho/:id', { preHandler: [...contexto, deps.autorizar(PERMISSOES_ARTIGOS.editar)], schema: { tags: ['manufatura'], security: seguranca, params: idParam, body: artigoCentroBody } }, async (request, reply) => {
      const existente = await request.prismaTenant.artigoCentroTrabalho.findFirst({ where: { idArtigoCentroTrabalho: request.params.id, artigo: { estabelecimentoId: request.estabelecimentoId }, centroTrabalho: { estabelecimentoId: request.estabelecimentoId } } });
      if (!existente) return reply.status(404).send({ message: 'Ciclo do artigo não encontrado.' });
      const [artigo, centro] = await Promise.all([request.prismaTenant.artigo.findFirst({ where: { idArtigo: request.body.artigoId, estabelecimentoId: request.estabelecimentoId } }), request.prismaTenant.centroTrabalho.findFirst({ where: { idCentroTrabalho: request.body.centroTrabalhoId, estabelecimentoId: request.estabelecimentoId } })]);
      if (!artigo) return reply.status(422).send({ message: 'Artigo inexistente.' });
      if (!centro) return reply.status(422).send({ message: 'Centro de trabalho inexistente.' });
      if (centro.status !== 'ATIVO') return reply.status(422).send({ message: 'Centro de trabalho inativo.' });
      const { artigoId, centroTrabalhoId, ...valores } = request.body;
      return reply.status(200).send(await request.prismaTenant.artigoCentroTrabalho.update({ where: { idArtigoCentroTrabalho: existente.idArtigoCentroTrabalho }, data: { artigoId, centroTrabalhoId, ...valores } as Prisma.ArtigoCentroTrabalhoUncheckedUpdateInput }));
    });
    app.delete('/manufatura/artigos-centros-trabalho/:id', { preHandler: [...contexto, deps.autorizar(PERMISSOES_ARTIGOS.excluir)], schema: { tags: ['manufatura'], security: seguranca, params: idParam } }, async (request, reply) => {
      const existente = await request.prismaTenant.artigoCentroTrabalho.findFirst({ where: { idArtigoCentroTrabalho: request.params.id, artigo: { estabelecimentoId: request.estabelecimentoId } } });
      if (!existente) return reply.status(404).send({ message: 'Ciclo do artigo não encontrado.' });
      await request.prismaTenant.artigoCentroTrabalho.delete({ where: { idArtigoCentroTrabalho: existente.idArtigoCentroTrabalho } });
      return reply.status(204).send();
    });

    app.post('/manufatura/planos-producao', {
      preHandler: [...contexto, deps.autorizar('manufatura:create')],
      schema: { tags: ['manufatura'], summary: 'Cria um plano de produção', security: seguranca, body: planoProducaoBody },
    }, async (request, reply) => {
      const plano = await request.prismaTenant.planoProducao.create({ data: { estabelecimentoId: request.estabelecimentoId, ...request.body } as Prisma.PlanoProducaoUncheckedCreateInput });
      return reply.status(201).send(plano);
    });

    app.get('/manufatura/ordens-producao', {
      preHandler: [...contexto, deps.autorizar('manufatura:list')],
      schema: { tags: ['manufatura'], summary: 'Lista ordens de produção', security: seguranca, querystring: listarQuery.extend({ status: z.string().optional() }) },
    }, async (request, reply) => {
      const { listarOrdensProducao } = deps.montarUseCases(request.prismaTenant);
      return reply.status(200).send(await listarOrdensProducao.executar({ estabelecimentoId: request.estabelecimentoId, ...request.query }));
    });

    app.get('/manufatura/ordens-producao/:id', {
      preHandler: [...contexto, deps.autorizar('manufatura:list')],
      schema: { tags: ['manufatura'], summary: 'Busca uma ordem de produção', security: seguranca, params: idParam },
    }, async (request, reply) => {
      const { buscarOrdemProducao } = deps.montarUseCases(request.prismaTenant);
      return reply.status(200).send(await buscarOrdemProducao.executar({ id: request.params.id, estabelecimentoId: request.estabelecimentoId }));
    });

    const criarOrdem = async (request: { prismaTenant: PrismaClient; estabelecimentoId: string; body: z.infer<typeof ordemProducaoBody> }, reply: { status: (code: number) => { send: (body: unknown) => unknown } }, origem: 'OCTOPUS' | 'ERP' | 'TERMINAL' | 'PLANO') => {
      const { criarOrdemProducao } = deps.montarUseCases(request.prismaTenant);
      return reply.status(201).send(await criarOrdemProducao.executar({ estabelecimentoId: request.estabelecimentoId, ...request.body, origem }));
    };
    for (const [path, origem, summary] of [
      ['/manufatura/ordens-producao', 'OCTOPUS', 'Cria uma ordem manual'],
      ['/manufatura/ordens-producao/integracao/erp', 'ERP', 'Importa uma ordem do ERP'],
      ['/manufatura/ordens-producao/integracao/terminal', 'TERMINAL', 'Sincroniza uma ordem do terminal'],
      ['/manufatura/ordens-producao/por-plano', 'PLANO', 'Gera uma ordem a partir de um plano'],
    ] as const) {
      app.post(path, {
        preHandler: [...contexto, deps.autorizar('manufatura:create')],
        schema: { tags: ['manufatura'], summary, security: seguranca, body: ordemProducaoBody },
      }, async (request, reply) => criarOrdem(request, reply, origem));
    }

    // ------------------------------------------------------------------ Turnos
    app.get(
      '/manufatura/turnos',
      {
        preHandler: [...contexto, deps.autorizar('manufatura:list')],
        schema: {
          tags: ['manufatura'],
          summary: 'Lista os turnos do estabelecimento ativo (filtro opcional por calendário)',
          security: seguranca,
          querystring: listarTurnosQuery,
        },
      },
      async (request, reply) => {
        const { listarTurnos } = deps.montarUseCases(request.prismaTenant);
        return reply.status(200).send(
          await listarTurnos.executar({
            estabelecimentoId: request.estabelecimentoId,
            ...request.query,
          }),
        );
      },
    );

    app.get(
      '/manufatura/turnos/:id',
      {
        preHandler: [...contexto, deps.autorizar('manufatura:list')],
        schema: {
          tags: ['manufatura'],
          summary: 'Busca um turno por id',
          security: seguranca,
          params: idParam,
        },
      },
      async (request, reply) => {
        const { buscarTurno } = deps.montarUseCases(request.prismaTenant);
        return reply.status(200).send(
          await buscarTurno.executar({
            idTurno: request.params.id,
            estabelecimentoId: request.estabelecimentoId,
          }),
        );
      },
    );

    app.post(
      '/manufatura/turnos',
      {
        preHandler: [...contexto, deps.autorizar('manufatura:create')],
        schema: {
          tags: ['manufatura'],
          summary: 'Cria um turno em um calendário',
          security: seguranca,
          body: turnoBody,
        },
      },
      async (request, reply) => {
        const { criarTurno } = deps.montarUseCases(request.prismaTenant);
        return reply.status(201).send(
          await criarTurno.executar({
            estabelecimentoId: request.estabelecimentoId,
            ...request.body,
          }),
        );
      },
    );

    app.put(
      '/manufatura/turnos/:id',
      {
        preHandler: [...contexto, deps.autorizar('manufatura:update')],
        schema: {
          tags: ['manufatura'],
          summary: 'Edita um turno',
          security: seguranca,
          params: idParam,
          body: turnoBody,
        },
      },
      async (request, reply) => {
        const { editarTurno } = deps.montarUseCases(request.prismaTenant);
        return reply.status(200).send(
          await editarTurno.executar({
            idTurno: request.params.id,
            estabelecimentoId: request.estabelecimentoId,
            ...request.body,
          }),
        );
      },
    );

    app.delete(
      '/manufatura/turnos/:id',
      {
        preHandler: [...contexto, deps.autorizar('manufatura:delete')],
        schema: {
          tags: ['manufatura'],
          summary: 'Exclui um turno',
          security: seguranca,
          params: idParam,
        },
      },
      async (request, reply) => {
        const { excluirTurno } = deps.montarUseCases(request.prismaTenant);
        await excluirTurno.executar({
          idTurno: request.params.id,
          estabelecimentoId: request.estabelecimentoId,
        });
        return reply.status(204).send();
      },
    );

    // ---------------------------------------------------------------- Reservas
    app.get(
      '/manufatura/reservas',
      {
        preHandler: [...contexto, deps.autorizar('manufatura:list')],
        schema: {
          tags: ['manufatura'],
          summary: 'Lista as reservas do estabelecimento ativo (filtro opcional por ordem)',
          security: seguranca,
          querystring: listarReservasQuery,
        },
      },
      async (request, reply) => {
        const { listarReservas } = deps.montarUseCases(request.prismaTenant);
        return reply.status(200).send(
          await listarReservas.executar({
            estabelecimentoId: request.estabelecimentoId,
            ...request.query,
          }),
        );
      },
    );

    app.get(
      '/manufatura/reservas/:id',
      {
        preHandler: [...contexto, deps.autorizar('manufatura:list')],
        schema: {
          tags: ['manufatura'],
          summary: 'Busca uma reserva por id',
          security: seguranca,
          params: idParam,
        },
      },
      async (request, reply) => {
        const { buscarReserva } = deps.montarUseCases(request.prismaTenant);
        return reply.status(200).send(
          await buscarReserva.executar({
            idReserva: request.params.id,
            estabelecimentoId: request.estabelecimentoId,
          }),
        );
      },
    );

    // Duas portas de entrada, como no legado: o terminal ignora o status da
    // ordem ("Permite edições vindas do terminal independente do status"), o
    // site não. A origem é o PATH, não um campo do body — assim não dá para
    // burlar a validação mandando uma flag.
    for (const [path, origemTerminal, summary] of [
      ['/manufatura/reservas', false, 'Cria uma reserva (site — valida o status da ordem)'],
      [
        '/manufatura/reservas/terminal',
        true,
        'Cria uma reserva a partir do terminal (ignora o status da ordem)',
      ],
    ] as const) {
      app.post(
        path,
        {
          preHandler: [...contexto, deps.autorizar('manufatura:create')],
          schema: { tags: ['manufatura'], summary, security: seguranca, body: reservaBody },
        },
        async (request, reply) => {
          const { criarReserva } = deps.montarUseCases(request.prismaTenant);
          return reply.status(201).send(
            await criarReserva.executar({
              estabelecimentoId: request.estabelecimentoId,
              origemTerminal,
              ...request.body,
            }),
          );
        },
      );
    }

    for (const [path, origemTerminal, summary] of [
      ['/manufatura/reservas/:id', false, 'Edita uma reserva (site)'],
      ['/manufatura/reservas/:id/terminal', true, 'Edita uma reserva a partir do terminal'],
    ] as const) {
      app.put(
        path,
        {
          preHandler: [...contexto, deps.autorizar('manufatura:update')],
          schema: {
            tags: ['manufatura'],
            summary,
            security: seguranca,
            params: idParam,
            body: reservaBody,
          },
        },
        async (request, reply) => {
          const { editarReserva } = deps.montarUseCases(request.prismaTenant);
          return reply.status(200).send(
            await editarReserva.executar({
              idReserva: request.params.id,
              estabelecimentoId: request.estabelecimentoId,
              origemTerminal,
              ...request.body,
            }),
          );
        },
      );
    }

    // Cancelamento é transição de estado, não exclusão: o registro permanece
    // com status CANCELADA. Idempotente — cancelar duas vezes devolve 200.
    app.post(
      '/manufatura/reservas/:id/cancelar',
      {
        preHandler: [...contexto, deps.autorizar('manufatura:delete')],
        schema: {
          tags: ['manufatura'],
          summary: 'Cancela uma reserva (idempotente; não exclui o registro)',
          security: seguranca,
          params: idParam,
        },
      },
      async (request, reply) => {
        const { cancelarReserva } = deps.montarUseCases(request.prismaTenant);
        return reply.status(200).send(
          await cancelarReserva.executar({
            idReserva: request.params.id,
            estabelecimentoId: request.estabelecimentoId,
          }),
        );
      },
    );

    // -------------------------------------------------------------- Movimentos
    app.get(
      '/manufatura/movimentos',
      {
        preHandler: [...contexto, deps.autorizar('manufatura:list')],
        schema: {
          tags: ['manufatura'],
          summary: 'Lista os movimentos (filtros por centro, ordem e tipo)',
          security: seguranca,
          querystring: listarMovimentosQuery,
        },
      },
      async (request, reply) => {
        const { listarMovimentos } = deps.montarUseCases(request.prismaTenant);
        return reply.status(200).send(
          await listarMovimentos.executar({
            estabelecimentoId: request.estabelecimentoId,
            ...request.query,
          }),
        );
      },
    );

    app.get(
      '/manufatura/movimentos/:id',
      {
        preHandler: [...contexto, deps.autorizar('manufatura:list')],
        schema: {
          tags: ['manufatura'],
          summary: 'Busca um movimento por id',
          security: seguranca,
          params: idParam,
        },
      },
      async (request, reply) => {
        const { buscarMovimento } = deps.montarUseCases(request.prismaTenant);
        return reply.status(200).send(
          await buscarMovimento.executar({
            idMovimento: request.params.id,
            estabelecimentoId: request.estabelecimentoId,
          }),
        );
      },
    );

    // Site x terminal, de novo pelo PATH: só o terminal aceita centro inativo e
    // autocadastra classificações desconhecidas.
    for (const [path, origemTerminal, summary] of [
      ['/manufatura/movimentos', false, 'Registra um movimento (site)'],
      [
        '/manufatura/movimentos/terminal',
        true,
        'Registra um movimento do terminal (aceita centro inativo; autocadastra classificações)',
      ],
    ] as const) {
      app.post(
        path,
        {
          preHandler: [...contexto, deps.autorizar('manufatura:create')],
          schema: { tags: ['manufatura'], summary, security: seguranca, body: movimentoBody },
        },
        async (request, reply) => {
          const { registrarMovimento } = deps.montarUseCases(request.prismaTenant);
          return reply.status(201).send(
            await registrarMovimento.executar({
              estabelecimentoId: request.estabelecimentoId,
              origemTerminal,
              ...request.body,
            }),
          );
        },
      );
    }

    app.post(
      '/manufatura/movimentos/:id/cancelar',
      {
        preHandler: [...contexto, deps.autorizar('manufatura:delete')],
        schema: {
          tags: ['manufatura'],
          summary: 'Cancela um movimento (recusa se já cancelado ou já integrado)',
          security: seguranca,
          params: idParam,
          body: cancelarMovimentoBody,
        },
      },
      async (request, reply) => {
        const { cancelarMovimento } = deps.montarUseCases(request.prismaTenant);
        return reply.status(200).send(
          await cancelarMovimento.executar({
            idMovimento: request.params.id,
            estabelecimentoId: request.estabelecimentoId,
            ...request.body,
          }),
        );
      },
    );

    app.post(
      '/manufatura/movimentos/:id/reintegrar',
      {
        preHandler: [...contexto, deps.autorizar('manufatura:update')],
        schema: {
          tags: ['manufatura'],
          summary: 'Reintegra um movimento ao ERP (só para movimentos que reportam)',
          security: seguranca,
          params: idParam,
        },
      },
      async (request, reply) => {
        const { reintegrarMovimento } = deps.montarUseCases(request.prismaTenant);
        return reply.status(200).send(
          await reintegrarMovimento.executar({
            idMovimento: request.params.id,
            estabelecimentoId: request.estabelecimentoId,
          }),
        );
      },
    );
  };
}
