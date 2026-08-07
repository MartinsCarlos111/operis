import type { FastifyInstance, preHandlerAsyncHookHandler } from 'fastify';
import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
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
  BuscarQualidadeItemUseCase,
  CriarQualidadeItemUseCase,
  EditarQualidadeItemUseCase,
  ExcluirQualidadeItemUseCase,
  ListarQualidadesItemUseCase,
} from '../../application/use-cases/cadastros-apoio.use-cases.js';
import type {
  BuscarItemUseCase,
  CriarItemUseCase,
  EditarItemUseCase,
  ExcluirItemUseCase,
  ListarItensUseCase,
} from '../../application/use-cases/item.use-cases.js';
import type {
  BuscarCentroTrabalhoItemUseCase,
  CriarCentroTrabalhoItemUseCase,
  EditarCentroTrabalhoItemUseCase,
  ExcluirCentroTrabalhoItemUseCase,
  ListarCentrosTrabalhoItensUseCase,
} from '../../application/use-cases/centro-trabalho-item.use-cases.js';
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
import type {
  BaixarOrdensProducaoUseCase,
  CancelarOrdensProducaoUseCase,
  IniciarOrdemProducaoUseCase,
  LiberarOrdensProducaoUseCase,
} from '../../application/use-cases/ordem-producao-ciclo-vida.use-cases.js';
import type {
  BuscarEtiquetaUseCase,
  CancelarEtiquetaUseCase,
  ImprimirEtiquetaUseCase,
  ListarEtiquetasUseCase,
  ListarRastreabilidadesUseCase,
} from '../../application/use-cases/etiqueta.use-cases.js';
import type {
  CriarFerramentaUseCase,
  EditarFerramentaUseCase,
  ExcluirFerramentaUseCase,
  ListarFerramentasUseCase,
} from '../../application/use-cases/ferramenta.use-cases.js';


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

const qualidadeItemBody = z.object({
  descricao: z.string().min(1),
});

const itemBody = z.object({
  codigo: z.string().min(1),
  descricao: z.string().min(1),
  status: statusSchema.optional(),
  qualidadeItemIds: z.array(z.string().uuid()).optional(),
});

const atributosCentroTrabalhoItem = {
  cicloProdutivoHora: z.number().min(0).nullable().optional(),
  cicloProdutivoPecaSegundos: z.number().int().min(0).nullable().optional(),
  tempoPreparacaoSegundos: z.number().int().min(0).nullable().optional(),
  fatorRefugo: z.number().min(0).nullable().optional(),
  qtdRefugo: z.number().min(0).nullable().optional(),
  qtdPerda: z.number().min(0).nullable().optional(),
  apontarPreparacao: z.number().min(0).nullable().optional(),
  tempoMaquinaSegundos: z.number().int().min(0).nullable().optional(),
  loteMultiplo: z.number().min(0).nullable().optional(),
  ativo: z.boolean().optional(),
};

const centroTrabalhoItemBody = z.object({
  itemId: z.string().uuid(),
  centroTrabalhoId: z.string().uuid(),
  ...atributosCentroTrabalhoItem,
});

const editarCentroTrabalhoItemBody = z.object(atributosCentroTrabalhoItem);

const listarCentrosTrabalhoItensQuery = listarQuery.extend({
  itemId: z.string().uuid().optional(),
  centroTrabalhoId: z.string().uuid().optional(),
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
const idsOrdensProducaoBody = z.object({
  idsOrdensProducao: z.array(z.string().uuid()).min(1, 'Informe ao menos uma ordem.'),
});
const cancelarOrdensProducaoBody = idsOrdensProducaoBody.extend({
  motivo: z.string().trim().min(1).optional(),
});
const planoProducaoBody = z.object({
  codigo: z.string().min(1), descricao: z.string().min(1), itemCodigo: z.string().min(1),
  itemDescricao: z.string().nullable().optional(), quantidade: z.number().positive(),
  unidadeMedida: z.enum(['UNIDADE', 'METRAGEM', 'PESO', 'AREA', 'VOLUME', 'ESPECIFICA']).optional(),
  centroTrabalhoId: z.string().uuid().nullable().optional(), grupoMaquinaId: z.string().uuid().nullable().optional(),
  inicioPlanejado: z.string().datetime().nullable().optional(), fimPlanejado: z.string().datetime().nullable().optional(),
});

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

  criarQualidadeItem: CriarQualidadeItemUseCase;
  editarQualidadeItem: EditarQualidadeItemUseCase;
  excluirQualidadeItem: ExcluirQualidadeItemUseCase;
  buscarQualidadeItem: BuscarQualidadeItemUseCase;
  listarQualidadesItem: ListarQualidadesItemUseCase;

  criarItem: CriarItemUseCase;
  editarItem: EditarItemUseCase;
  excluirItem: ExcluirItemUseCase;
  buscarItem: BuscarItemUseCase;
  listarItens: ListarItensUseCase;

  criarCentroTrabalhoItem: CriarCentroTrabalhoItemUseCase;
  editarCentroTrabalhoItem: EditarCentroTrabalhoItemUseCase;
  excluirCentroTrabalhoItem: ExcluirCentroTrabalhoItemUseCase;
  buscarCentroTrabalhoItem: BuscarCentroTrabalhoItemUseCase;
  listarCentrosTrabalhoItens: ListarCentrosTrabalhoItensUseCase;

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

  // Ciclo de vida da Ordem de Produção (ex-OrdensProducaoController lib/canc/baix/reexec/devolver).
  liberarOrdensProducao: LiberarOrdensProducaoUseCase;
  cancelarOrdensProducao: CancelarOrdensProducaoUseCase;
  baixarOrdensProducao: BaixarOrdensProducaoUseCase;
  iniciarOrdemProducao: IniciarOrdemProducaoUseCase;

  // Etiqueta + Rastreabilidade (itens concluídos físicos)
  imprimirEtiqueta: ImprimirEtiquetaUseCase;
  cancelarEtiqueta: CancelarEtiquetaUseCase;
  buscarEtiqueta: BuscarEtiquetaUseCase;
  listarEtiquetas: ListarEtiquetasUseCase;
  listarRastreabilidades: ListarRastreabilidadesUseCase;

  // Ferramenta
  criarFerramenta: CriarFerramentaUseCase;
  editarFerramenta: EditarFerramentaUseCase;
  excluirFerramenta: ExcluirFerramentaUseCase;
  listarFerramentas: ListarFerramentasUseCase;
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

    // ---------------------------------------------------------- Qualidades do item
    app.get(
      '/manufatura/qualidades-item',
      {
        preHandler: [...contexto, deps.autorizar('manufatura:list')],
        schema: {
          tags: ['manufatura'],
          summary: 'Lista as qualidades de item do estabelecimento ativo (paginado)',
          security: seguranca,
          querystring: listarQuery,
        },
      },
      async (request, reply) => {
        const { listarQualidadesItem } = deps.montarUseCases(request.prismaTenant);
        return reply.status(200).send(
          await listarQualidadesItem.executar({
            estabelecimentoId: request.estabelecimentoId,
            ...request.query,
          }),
        );
      },
    );

    app.get(
      '/manufatura/qualidades-item/:id',
      {
        preHandler: [...contexto, deps.autorizar('manufatura:list')],
        schema: {
          tags: ['manufatura'],
          summary: 'Busca uma qualidade de item por id',
          security: seguranca,
          params: idParam,
        },
      },
      async (request, reply) => {
        const { buscarQualidadeItem } = deps.montarUseCases(request.prismaTenant);
        return reply.status(200).send(
          await buscarQualidadeItem.executar({
            idQualidadeItem: request.params.id,
            estabelecimentoId: request.estabelecimentoId,
          }),
        );
      },
    );

    app.post(
      '/manufatura/qualidades-item',
      {
        preHandler: [...contexto, deps.autorizar('manufatura:create')],
        schema: {
          tags: ['manufatura'],
          summary: 'Cria uma qualidade de item',
          security: seguranca,
          body: qualidadeItemBody,
        },
      },
      async (request, reply) => {
        const { criarQualidadeItem } = deps.montarUseCases(request.prismaTenant);
        return reply.status(201).send(
          await criarQualidadeItem.executar({
            estabelecimentoId: request.estabelecimentoId,
            ...request.body,
          }),
        );
      },
    );

    app.put(
      '/manufatura/qualidades-item/:id',
      {
        preHandler: [...contexto, deps.autorizar('manufatura:update')],
        schema: {
          tags: ['manufatura'],
          summary: 'Edita uma qualidade de item',
          security: seguranca,
          params: idParam,
          body: qualidadeItemBody,
        },
      },
      async (request, reply) => {
        const { editarQualidadeItem } = deps.montarUseCases(request.prismaTenant);
        return reply.status(200).send(
          await editarQualidadeItem.executar({
            idQualidadeItem: request.params.id,
            estabelecimentoId: request.estabelecimentoId,
            ...request.body,
          }),
        );
      },
    );

    app.delete(
      '/manufatura/qualidades-item/:id',
      {
        preHandler: [...contexto, deps.autorizar('manufatura:delete')],
        schema: {
          tags: ['manufatura'],
          summary: 'Exclui uma qualidade de item',
          security: seguranca,
          params: idParam,
        },
      },
      async (request, reply) => {
        const { excluirQualidadeItem } = deps.montarUseCases(request.prismaTenant);
        await excluirQualidadeItem.executar({
          idQualidadeItem: request.params.id,
          estabelecimentoId: request.estabelecimentoId,
        });
        return reply.status(204).send();
      },
    );

    // ---------------------------------------------------------------------- Itens
    app.get(
      '/manufatura/itens',
      {
        preHandler: [...contexto, deps.autorizar('manufatura:list')],
        schema: {
          tags: ['manufatura'],
          summary: 'Lista os itens do estabelecimento ativo (paginado)',
          security: seguranca,
          querystring: listarQuery,
        },
      },
      async (request, reply) => {
        const { listarItens } = deps.montarUseCases(request.prismaTenant);
        return reply.status(200).send(
          await listarItens.executar({
            estabelecimentoId: request.estabelecimentoId,
            ...request.query,
          }),
        );
      },
    );

    app.get(
      '/manufatura/itens/:id',
      {
        preHandler: [...contexto, deps.autorizar('manufatura:list')],
        schema: {
          tags: ['manufatura'],
          summary: 'Busca um item por id',
          security: seguranca,
          params: idParam,
        },
      },
      async (request, reply) => {
        const { buscarItem } = deps.montarUseCases(request.prismaTenant);
        return reply.status(200).send(
          await buscarItem.executar({
            idItem: request.params.id,
            estabelecimentoId: request.estabelecimentoId,
          }),
        );
      },
    );

    app.post(
      '/manufatura/itens',
      {
        preHandler: [...contexto, deps.autorizar('manufatura:create')],
        schema: {
          tags: ['manufatura'],
          summary: 'Cria um item, com as qualidades vinculadas',
          security: seguranca,
          body: itemBody,
        },
      },
      async (request, reply) => {
        const { criarItem } = deps.montarUseCases(request.prismaTenant);
        return reply.status(201).send(
          await criarItem.executar({
            estabelecimentoId: request.estabelecimentoId,
            ...request.body,
          }),
        );
      },
    );

    app.put(
      '/manufatura/itens/:id',
      {
        preHandler: [...contexto, deps.autorizar('manufatura:update')],
        schema: {
          tags: ['manufatura'],
          summary: 'Edita um item, substituindo as qualidades vinculadas',
          security: seguranca,
          params: idParam,
          body: itemBody,
        },
      },
      async (request, reply) => {
        const { editarItem } = deps.montarUseCases(request.prismaTenant);
        return reply.status(200).send(
          await editarItem.executar({
            idItem: request.params.id,
            estabelecimentoId: request.estabelecimentoId,
            ...request.body,
          }),
        );
      },
    );

    app.delete(
      '/manufatura/itens/:id',
      {
        preHandler: [...contexto, deps.autorizar('manufatura:delete')],
        schema: {
          tags: ['manufatura'],
          summary: 'Exclui um item',
          security: seguranca,
          params: idParam,
        },
      },
      async (request, reply) => {
        const { excluirItem } = deps.montarUseCases(request.prismaTenant);
        await excluirItem.executar({
          idItem: request.params.id,
          estabelecimentoId: request.estabelecimentoId,
        });
        return reply.status(204).send();
      },
    );

    // -------------------------------------------------- Item x Centro de Trabalho
    app.get(
      '/manufatura/centros-trabalho-itens',
      {
        preHandler: [...contexto, deps.autorizar('manufatura:list')],
        schema: {
          tags: ['manufatura'],
          summary: 'Lista os vínculos Item x Centro de Trabalho (filtros opcionais por item/centro)',
          security: seguranca,
          querystring: listarCentrosTrabalhoItensQuery,
        },
      },
      async (request, reply) => {
        const { listarCentrosTrabalhoItens } = deps.montarUseCases(request.prismaTenant);
        return reply.status(200).send(
          await listarCentrosTrabalhoItens.executar({
            estabelecimentoId: request.estabelecimentoId,
            ...request.query,
          }),
        );
      },
    );

    app.get(
      '/manufatura/centros-trabalho-itens/:id',
      {
        preHandler: [...contexto, deps.autorizar('manufatura:list')],
        schema: {
          tags: ['manufatura'],
          summary: 'Busca um vínculo Item x Centro de Trabalho por id',
          security: seguranca,
          params: idParam,
        },
      },
      async (request, reply) => {
        const { buscarCentroTrabalhoItem } = deps.montarUseCases(request.prismaTenant);
        return reply.status(200).send(
          await buscarCentroTrabalhoItem.executar({
            idCentroTrabalhoItem: request.params.id,
            estabelecimentoId: request.estabelecimentoId,
          }),
        );
      },
    );

    app.post(
      '/manufatura/centros-trabalho-itens',
      {
        preHandler: [...contexto, deps.autorizar('manufatura:create')],
        schema: {
          tags: ['manufatura'],
          summary: 'Vincula um item a um centro de trabalho (par único; recusa se já relacionados)',
          security: seguranca,
          body: centroTrabalhoItemBody,
        },
      },
      async (request, reply) => {
        const { criarCentroTrabalhoItem } = deps.montarUseCases(request.prismaTenant);
        return reply.status(201).send(
          await criarCentroTrabalhoItem.executar({
            estabelecimentoId: request.estabelecimentoId,
            ...request.body,
          }),
        );
      },
    );

    app.put(
      '/manufatura/centros-trabalho-itens/:id',
      {
        preHandler: [...contexto, deps.autorizar('manufatura:update')],
        schema: {
          tags: ['manufatura'],
          summary: 'Edita os atributos do vínculo (item e centro de trabalho não são alteráveis)',
          security: seguranca,
          params: idParam,
          body: editarCentroTrabalhoItemBody,
        },
      },
      async (request, reply) => {
        const { editarCentroTrabalhoItem } = deps.montarUseCases(request.prismaTenant);
        return reply.status(200).send(
          await editarCentroTrabalhoItem.executar({
            idCentroTrabalhoItem: request.params.id,
            estabelecimentoId: request.estabelecimentoId,
            ...request.body,
          }),
        );
      },
    );

    app.delete(
      '/manufatura/centros-trabalho-itens/:id',
      {
        preHandler: [...contexto, deps.autorizar('manufatura:delete')],
        schema: {
          tags: ['manufatura'],
          summary: 'Exclui um vínculo Item x Centro de Trabalho',
          security: seguranca,
          params: idParam,
        },
      },
      async (request, reply) => {
        const { excluirCentroTrabalhoItem } = deps.montarUseCases(request.prismaTenant);
        await excluirCentroTrabalhoItem.executar({
          idCentroTrabalhoItem: request.params.id,
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

    // --------------------------------------- Ciclo de vida da Ordem de Produção
    // Transições de estado (liberar/cancelar/baixar) em lote por ids; iniciar é
    // unitário (paridade com a abertura de ordem no terminal). Idempotentes.
    app.post(
      '/manufatura/ordens-producao/liberar',
      {
        preHandler: [...contexto, deps.autorizar('manufatura:liberar')],
        schema: {
          tags: ['manufatura'],
          summary: 'Libera ordens pendentes (NAO_LIBERADA/RECUSADA; LIBERADA é idempotente)',
          security: seguranca,
          body: idsOrdensProducaoBody,
        },
      },
      async (request, reply) => {
        const { liberarOrdensProducao } = deps.montarUseCases(request.prismaTenant);
        return reply.status(200).send(
          await liberarOrdensProducao.executar({
            estabelecimentoId: request.estabelecimentoId,
            usuarioId: request.usuarioId,
            ...request.body,
          }),
        );
      },
    );

    app.post(
      '/manufatura/ordens-producao/cancelar',
      {
        preHandler: [...contexto, deps.autorizar('manufatura:cancelar')],
        schema: {
          tags: ['manufatura'],
          summary: 'Cancela ordens (recusa iniciadas/concluídas/baixadas; motivo opcional)',
          security: seguranca,
          body: cancelarOrdensProducaoBody,
        },
      },
      async (request, reply) => {
        const { cancelarOrdensProducao } = deps.montarUseCases(request.prismaTenant);
        return reply.status(200).send(
          await cancelarOrdensProducao.executar({
            estabelecimentoId: request.estabelecimentoId,
            ...request.body,
          }),
        );
      },
    );

    app.post(
      '/manufatura/ordens-producao/baixar',
      {
        preHandler: [...contexto, deps.autorizar('manufatura:baixar')],
        schema: {
          tags: ['manufatura'],
          summary: 'Baixa ordens concluídas (BAIXADA é idempotente)',
          security: seguranca,
          body: idsOrdensProducaoBody,
        },
      },
      async (request, reply) => {
        const { baixarOrdensProducao } = deps.montarUseCases(request.prismaTenant);
        return reply.status(200).send(
          await baixarOrdensProducao.executar({
            estabelecimentoId: request.estabelecimentoId,
            usuarioId: request.usuarioId,
            ...request.body,
          }),
        );
      },
    );

    app.post(
      '/manufatura/ordens-producao/:id/iniciar',
      {
        preHandler: [...contexto, deps.autorizar('manufatura:update')],
        schema: {
          tags: ['manufatura'],
          summary: 'Inicia uma ordem liberada (INICIADA é idempotente)',
          security: seguranca,
          params: idParam,
        },
      },
      async (request, reply) => {
        const { iniciarOrdemProducao } = deps.montarUseCases(request.prismaTenant);
        return reply.status(200).send(
          await iniciarOrdemProducao.executar({
            idOrdemProducao: request.params.id,
            estabelecimentoId: request.estabelecimentoId,
          }),
        );
      },
    );

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
