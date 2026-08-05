import { Turno, type DadosTurno, type DiaSemana } from '../../domain/entities/turno.js';
import type { StatusRecurso } from '@shared/domain/status-recurso.js';
import type { GeradorId } from '@shared/domain/gerador-id.js';
import type {
  CalendarioRepository,
  CriterioListagem,
  TurnoRepository,
} from '../../domain/repositories/manufatura.repositories.js';
import {
  CalendarioNaoEncontradoError,
  CodigoTurnoJaExisteError,
  TurnoNaoEncontradoError,
} from '../../domain/exceptions/manufatura.errors.js';
import type { ListaPaginadaDTO } from '../dtos/manufatura.dtos.js';

export interface TurnoDTO {
  idTurno: string;
  codigo: string;
  descricao: string;
  calendarioId: string;
  inicioMinutos: number;
  fimMinutos: number;
  tempoTotalMinutos: number;
  tempoDisponivelMinutos: number;
  /** Duração da janela já considerando a virada da meia-noite. */
  duracaoMinutos: number;
  diasSemana: DiaSemana[];
  util: boolean;
  observacao: string | null;
  status: StatusRecurso;
  criadoEm: string;
  atualizadoEm: string;
}

export function paraTurnoDTO(turno: Turno): TurnoDTO {
  return {
    idTurno: turno.idTurno,
    codigo: turno.codigo,
    descricao: turno.descricao,
    calendarioId: turno.calendarioId,
    inicioMinutos: turno.inicioMinutos,
    fimMinutos: turno.fimMinutos,
    tempoTotalMinutos: turno.tempoTotalMinutos,
    tempoDisponivelMinutos: turno.tempoDisponivelMinutos,
    duracaoMinutos: turno.duracaoMinutos(),
    diasSemana: turno.diasSemana,
    util: turno.util,
    observacao: turno.observacao,
    status: turno.status,
    criadoEm: turno.criadoEm.toISOString(),
    atualizadoEm: turno.atualizadoEm.toISOString(),
  };
}

export interface EntradaTurno extends DadosTurno {
  estabelecimentoId: string;
}

/**
 * O turno vive sob um calendário, e o calendário sob o estabelecimento ativo.
 * Resolver o calendário aqui garante os dois escopos de uma vez — um id de
 * calendário de outro estabelecimento não vaza (paridade com o
 * `BuscarCalendario` do TurnoRN, que valida a existência antes de salvar).
 */
async function exigirCalendario(
  input: EntradaTurno,
  calendarios: CalendarioRepository,
): Promise<void> {
  const calendario = await calendarios.buscarPorId(input.calendarioId, input.estabelecimentoId);
  if (!calendario) {
    throw new CalendarioNaoEncontradoError(input.calendarioId);
  }
}

/**
 * Cria um Turno. Preserva TurnoRN.AdicionarTurno:
 *   1. invariantes de forma (entidade)
 *   2. calendário existe
 *   3. código único dentro do calendário
 */
export class CriarTurnoUseCase {
  constructor(
    private readonly turnos: TurnoRepository,
    private readonly calendarios: CalendarioRepository,
    private readonly ids: GeradorId,
  ) {}

  async executar(input: EntradaTurno): Promise<TurnoDTO> {
    const turno = Turno.criar({ ...input, idTurno: this.ids.gerar() });

    await exigirCalendario(input, this.calendarios);

    const existente = await this.turnos.buscarPorCodigo(turno.codigo, input.calendarioId);
    if (existente) {
      throw new CodigoTurnoJaExisteError(turno.codigo);
    }

    await this.turnos.salvar(turno);
    return paraTurnoDTO(turno);
  }
}

export class EditarTurnoUseCase {
  constructor(
    private readonly turnos: TurnoRepository,
    private readonly calendarios: CalendarioRepository,
  ) {}

  async executar(input: EntradaTurno & { idTurno: string }): Promise<TurnoDTO> {
    const turno = await this.turnos.buscarPorId(input.idTurno, input.estabelecimentoId);
    if (!turno) {
      throw new TurnoNaoEncontradoError(input.idTurno);
    }

    await exigirCalendario(input, this.calendarios);

    const novoCodigo = input.codigo.trim();
    if (novoCodigo !== turno.codigo || input.calendarioId !== turno.calendarioId) {
      const colisao = await this.turnos.buscarPorCodigo(novoCodigo, input.calendarioId);
      if (colisao && colisao.idTurno !== turno.idTurno) {
        throw new CodigoTurnoJaExisteError(novoCodigo);
      }
    }

    turno.alterar(input);
    await this.turnos.salvar(turno);
    return paraTurnoDTO(turno);
  }
}

export class ExcluirTurnoUseCase {
  constructor(private readonly turnos: TurnoRepository) {}

  async executar(input: { idTurno: string; estabelecimentoId: string }): Promise<void> {
    const turno = await this.turnos.buscarPorId(input.idTurno, input.estabelecimentoId);
    if (!turno) {
      throw new TurnoNaoEncontradoError(input.idTurno);
    }
    await this.turnos.excluir(input.idTurno);
  }
}

export class BuscarTurnoUseCase {
  constructor(private readonly turnos: TurnoRepository) {}

  async executar(input: { idTurno: string; estabelecimentoId: string }): Promise<TurnoDTO> {
    const turno = await this.turnos.buscarPorId(input.idTurno, input.estabelecimentoId);
    if (!turno) {
      throw new TurnoNaoEncontradoError(input.idTurno);
    }
    return paraTurnoDTO(turno);
  }
}

export interface CriterioListagemTurno extends CriterioListagem {
  /** Filtra por calendário (a tela de Calendário lista os turnos dele). */
  calendarioId?: string | undefined;
}

export class ListarTurnosUseCase {
  constructor(private readonly turnos: TurnoRepository) {}

  async executar(criterio: CriterioListagemTurno): Promise<ListaPaginadaDTO<TurnoDTO>> {
    const [itens, count] = await Promise.all([
      this.turnos.listar(criterio),
      this.turnos.contar(criterio),
    ]);
    return { count, model: itens.map(paraTurnoDTO) };
  }
}
