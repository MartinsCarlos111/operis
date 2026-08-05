import {
  Movimento,
  TipoMovimento,
  type DadosMovimento,
  type QuantidadesMovimento,
} from '../../domain/entities/movimento.js';
import type { GeradorId } from '@shared/domain/gerador-id.js';
import type {
  CatalogoTipos,
  CriterioListagemMovimento,
  MovimentoRepository,
} from '../../domain/repositories/movimento.repositories.js';
import type {
  CentroTrabalhoRepository,
  ReservaRepository,
  TurnoRepository,
} from '../../domain/repositories/manufatura.repositories.js';
import type { OrdemProducaoRepository } from '../../domain/repositories/ordem-producao.repositories.js';
import {
  CentroTrabalhoNaoEncontradoError,
  ReservaNaoEncontradaError,
  TurnoNaoEncontradoError,
} from '../../domain/exceptions/manufatura.errors.js';
import { OrdemProducaoNaoEncontradaError } from '../../domain/exceptions/ordem-producao.errors.js';
import {
  CentroTrabalhoInativoError,
  MovimentoJaAbertoError,
  MovimentoNaoEncontradoError,
  TipoNaoCadastradoError,
} from '../../domain/exceptions/movimento.errors.js';
import type { ListaPaginadaDTO } from '../dtos/manufatura.dtos.js';

/**
 * Tipos que ocupam a máquina de forma exclusiva. Dois deles abertos ao mesmo
 * tempo no mesmo centro seria um estado impossível no chão de fábrica — a
 * máquina não produz e está parada simultaneamente.
 */
const EXCLUSIVOS: TipoMovimento[] = [
  TipoMovimento.REPORTE,
  TipoMovimento.PREPARACAO,
  TipoMovimento.PARADA,
];

export interface MovimentoDTO {
  idMovimento: string;
  tipo: TipoMovimento;
  centroTrabalhoId: string;
  ordemProducaoId: string | null;
  reservaId: string | null;
  usuarioId: string;
  operador: string;
  turnoId: string;
  dataTurno: string;
  inicio: string;
  fim: string | null;
  duracaoSegundos: number | null;
  consideraOee: boolean;
  quantidades: QuantidadesMovimento;
  tipoParadaId: string | null;
  tipoRefugoId: string | null;
  tipoCausaId: string | null;
  tipoRecusaId: string | null;
  reportaErp: boolean;
  dataIntegracao: string | null;
  cancelado: boolean;
  observacao: string | null;
}

export function paraMovimentoDTO(m: Movimento): MovimentoDTO {
  return {
    idMovimento: m.idMovimento,
    tipo: m.tipo,
    centroTrabalhoId: m.centroTrabalhoId,
    ordemProducaoId: m.ordemProducaoId,
    reservaId: m.reservaId,
    usuarioId: m.usuarioId,
    operador: m.operador,
    turnoId: m.turnoId,
    dataTurno: m.dataTurno.toISOString(),
    inicio: m.inicio.toISOString(),
    fim: m.fim ? m.fim.toISOString() : null,
    duracaoSegundos: m.duracaoSegundos,
    consideraOee: m.consideraOee,
    quantidades: m.quantidades,
    tipoParadaId: m.tipoParadaId,
    tipoRefugoId: m.tipoRefugoId,
    tipoCausaId: m.tipoCausaId,
    tipoRecusaId: m.tipoRecusaId,
    reportaErp: m.reportaErp,
    dataIntegracao: m.dataIntegracao ? m.dataIntegracao.toISOString() : null,
    cancelado: m.cancelado,
    observacao: m.observacao,
  };
}

export interface EntradaMovimento
  extends Omit<
    DadosMovimento,
    'unidadeMedidaCentro' | 'tipoParadaId' | 'tipoRefugoId' | 'tipoCausaId' | 'tipoRecusaId'
  > {
  estabelecimentoId: string;
  /**
   * ex-`edicaoWebsite == false`. Do terminal: aceita centro inativo e
   * autocadastra classificações desconhecidas.
   */
  origemTerminal?: boolean | undefined;
  /** Classificações por CÓDIGO, como no legado (o terminal só conhece códigos). */
  tipoParadaCodigo?: string | null | undefined;
  tipoRefugoCodigo?: string | null | undefined;
  tipoCausaCodigo?: string | null | undefined;
  tipoRecusaCodigo?: string | null | undefined;
}

/**
 * Registra um movimento. Preserva MovimentosRN.AdicionarMovimento +
 * ValidarMovimento, na mesma ordem:
 *   1. centro de trabalho existe (e está ativo, se não vier do terminal)
 *   2. ordem existe, quando informada
 *   3. reserva existe, quando informada
 *   4. turno existe
 *   5. classificações resolvidas por código — autocadastradas se vier do terminal
 *   6. invariantes de forma + estorno automático (entidade)
 *   7. não-paralelismo: nada de dois exclusivos abertos no mesmo centro
 */
export class RegistrarMovimentoUseCase {
  constructor(
    private readonly movimentos: MovimentoRepository,
    private readonly centros: CentroTrabalhoRepository,
    private readonly ordens: OrdemProducaoRepository,
    private readonly reservas: ReservaRepository,
    private readonly turnos: TurnoRepository,
    private readonly catalogo: CatalogoTipos,
    private readonly ids: GeradorId,
  ) {}

  async executar(input: EntradaMovimento): Promise<MovimentoDTO> {
    const doTerminal = input.origemTerminal ?? false;

    const centro = await this.centros.buscarPorId(input.centroTrabalhoId, input.estabelecimentoId);
    if (!centro) {
      throw new CentroTrabalhoNaoEncontradoError(input.centroTrabalhoId);
    }
    // O terminal reporta mesmo em centro inativo — o legado só barra no site.
    if (!doTerminal && !centro.estaAtivo()) {
      throw new CentroTrabalhoInativoError(centro.codigo);
    }

    if (input.ordemProducaoId) {
      const ordem = await this.ordens.buscarPorId(input.ordemProducaoId, input.estabelecimentoId);
      if (!ordem) throw new OrdemProducaoNaoEncontradaError(input.ordemProducaoId);
    }

    if (input.reservaId) {
      const reserva = await this.reservas.buscarPorId(input.reservaId, input.estabelecimentoId);
      if (!reserva) throw new ReservaNaoEncontradaError(input.reservaId);
    }

    const turno = await this.turnos.buscarPorId(input.turnoId, input.estabelecimentoId);
    if (!turno) throw new TurnoNaoEncontradoError(input.turnoId);

    const classificacoes = await this.resolverClassificacoes(input, doTerminal);

    const movimento = Movimento.criar({
      ...input,
      ...classificacoes,
      idMovimento: this.ids.gerar(),
      unidadeMedidaCentro: centro.parametros.tipoUnidadeMedida,
      inicioTurno: turno.resolverJanela(input.inicio ?? new Date()).inicio,
    });

    if (EXCLUSIVOS.includes(movimento.tipo) && movimento.estaAberto()) {
      const aberto = await this.movimentos.buscarAberto(movimento.centroTrabalhoId, EXCLUSIVOS);
      if (aberto) {
        throw new MovimentoJaAbertoError(aberto.tipo, aberto.idMovimento);
      }
    }

    await this.movimentos.salvar(movimento);
    return paraMovimentoDTO(movimento);
  }

  /**
   * Resolve os quatro códigos de classificação em ids. Vindo do terminal, um
   * código desconhecido é CRIADO (com descrição = código, e Criticidade Normal
   * no caso da parada); vindo do site, é erro.
   */
  private async resolverClassificacoes(input: EntradaMovimento, autocadastrar: boolean) {
    const resolver = async (
      codigo: string | null | undefined,
      fn: CatalogoTipos[keyof CatalogoTipos],
      rotulo: string,
    ): Promise<string | null> => {
      if (!codigo) return null;
      const id = await fn(codigo, input.estabelecimentoId, autocadastrar);
      if (!id) throw new TipoNaoCadastradoError(rotulo, codigo);
      return id;
    };

    return {
      tipoParadaId: await resolver(
        input.tipoParadaCodigo,
        this.catalogo.resolverParada.bind(this.catalogo),
        'Parada',
      ),
      tipoRefugoId: await resolver(
        input.tipoRefugoCodigo,
        this.catalogo.resolverRefugo.bind(this.catalogo),
        'Refugo',
      ),
      tipoCausaId: await resolver(
        input.tipoCausaCodigo,
        this.catalogo.resolverCausa.bind(this.catalogo),
        'Causa',
      ),
      tipoRecusaId: await resolver(
        input.tipoRecusaCodigo,
        this.catalogo.resolverRecusa.bind(this.catalogo),
        'Recusa',
      ),
    };
  }
}

/** Cancela um movimento (MovimentosRN.CancelarMovimento). */
export class CancelarMovimentoUseCase {
  constructor(private readonly movimentos: MovimentoRepository) {}

  async executar(input: {
    idMovimento: string;
    estabelecimentoId: string;
    observacao?: string | undefined;
    usuarioCancelamentoId?: string | undefined;
  }): Promise<MovimentoDTO> {
    const movimento = await this.movimentos.buscarPorId(
      input.idMovimento,
      input.estabelecimentoId,
    );
    if (!movimento) throw new MovimentoNaoEncontradoError(input.idMovimento);

    movimento.cancelar(input);
    await this.movimentos.salvar(movimento);
    return paraMovimentoDTO(movimento);
  }
}

/**
 * Reintegra um movimento (MovimentosRN.ReintegrarMovimento).
 *
 * PENDENTE: o legado também marca `Recalcular = true` nos
 * `MovimentosCalculoIndicadores` do movimento. Esse agregado ainda não existe
 * (P0 "Cálculo de Indicadores"); quando existir, entra aqui por injeção.
 */
export class ReintegrarMovimentoUseCase {
  constructor(private readonly movimentos: MovimentoRepository) {}

  async executar(input: {
    idMovimento: string;
    estabelecimentoId: string;
  }): Promise<MovimentoDTO> {
    const movimento = await this.movimentos.buscarPorId(
      input.idMovimento,
      input.estabelecimentoId,
    );
    if (!movimento) throw new MovimentoNaoEncontradoError(input.idMovimento);

    movimento.reintegrar();
    await this.movimentos.salvar(movimento);
    return paraMovimentoDTO(movimento);
  }
}

export class BuscarMovimentoUseCase {
  constructor(private readonly movimentos: MovimentoRepository) {}

  async executar(input: {
    idMovimento: string;
    estabelecimentoId: string;
  }): Promise<MovimentoDTO> {
    const movimento = await this.movimentos.buscarPorId(
      input.idMovimento,
      input.estabelecimentoId,
    );
    if (!movimento) throw new MovimentoNaoEncontradoError(input.idMovimento);
    return paraMovimentoDTO(movimento);
  }
}

export class ListarMovimentosUseCase {
  constructor(private readonly movimentos: MovimentoRepository) {}

  async executar(
    criterio: CriterioListagemMovimento,
  ): Promise<ListaPaginadaDTO<MovimentoDTO>> {
    const [itens, count] = await Promise.all([
      this.movimentos.listar(criterio),
      this.movimentos.contar(criterio),
    ]);
    return { count, model: itens.map(paraMovimentoDTO) };
  }
}
