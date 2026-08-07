import type { Calendario } from '../entities/calendario.js';
import type { GrupoMaquina } from '../entities/grupo-maquina.js';
import type { CentroTrabalho } from '../entities/centro-trabalho.js';
import type { Turno } from '../entities/turno.js';
import type { Reserva } from '../entities/reserva.js';
import type { QualidadeItem } from '../entities/qualidade-item.js';
import type { Item } from '../entities/item.js';
import type { CentroTrabalhoItem } from '../entities/centro-trabalho-item.js';

/**
 * Critério de listagem paginada dos cadastros de manufatura — mesma assinatura
 * já usada em Áreas (startIndex/maxRows/termo), que por sua vez espelha o
 * `GetXxx(startIndex, maxRows, jsonConditions)` dos controllers legados.
 */
export interface CriterioListagem {
  estabelecimentoId: string;
  startIndex: number;
  maxRows: number;
  termo?: string | undefined;
}

/**
 * Turno é escopado pelo calendário (que por sua vez é do estabelecimento), por
 * isso a listagem aceita o recorte opcional por calendário.
 */
export interface CriterioListagemTurnoRepo extends CriterioListagem {
  calendarioId?: string | undefined;
}

/**
 * Reserva é escopada pela ordem de produção (que é do estabelecimento). A
 * listagem aceita o recorte por ordem — é como a tela e o terminal a consultam.
 */
export interface CriterioListagemReserva extends CriterioListagem {
  ordemProducaoId?: string | undefined;
}

export interface ReservaRepository {
  buscarPorId(id: string, estabelecimentoId: string): Promise<Reserva | null>;
  /**
   * Identidade natural do legado (`BuscarIdReserva`): ordem + item + sequência.
   * É por ela que o terminal resolve a reserva de um movimento.
   */
  buscarPorIdentidade(
    ordemProducaoId: string,
    itemCodigo: string,
    sequencia: number,
  ): Promise<Reserva | null>;
  listar(criterio: CriterioListagemReserva): Promise<Reserva[]>;
  contar(criterio: CriterioListagemReserva): Promise<number>;
  salvar(reserva: Reserva): Promise<void>;
}

export interface TurnoRepository {
  buscarPorId(id: string, estabelecimentoId: string): Promise<Turno | null>;
  /** Unicidade do código dentro do calendário. */
  buscarPorCodigo(codigo: string, calendarioId: string): Promise<Turno | null>;
  listar(criterio: CriterioListagemTurnoRepo): Promise<Turno[]>;
  contar(criterio: CriterioListagemTurnoRepo): Promise<number>;
  salvar(turno: Turno): Promise<void>;
  excluir(id: string): Promise<void>;
}

export interface CalendarioRepository {
  buscarPorId(id: string, estabelecimentoId: string): Promise<Calendario | null>;
  buscarPorCodigo(codigo: string, estabelecimentoId: string): Promise<Calendario | null>;
  listar(criterio: CriterioListagem): Promise<Calendario[]>;
  contar(estabelecimentoId: string, termo?: string | undefined): Promise<number>;
  salvar(calendario: Calendario): Promise<void>;
  excluir(id: string): Promise<void>;
  /** Centros de trabalho que apontam para este calendário (bloqueia exclusão). */
  contarCentrosTrabalho(id: string): Promise<number>;
}

export interface GrupoMaquinaRepository {
  buscarPorId(id: string, estabelecimentoId: string): Promise<GrupoMaquina | null>;
  buscarPorCodigo(codigo: string, estabelecimentoId: string): Promise<GrupoMaquina | null>;
  listar(criterio: CriterioListagem): Promise<GrupoMaquina[]>;
  contar(estabelecimentoId: string, termo?: string | undefined): Promise<number>;
  salvar(grupo: GrupoMaquina): Promise<void>;
  excluir(id: string): Promise<void>;
  contarCentrosTrabalho(id: string): Promise<number>;
}

export interface QualidadeItemRepository {
  buscarPorId(id: string, estabelecimentoId: string): Promise<QualidadeItem | null>;
  buscarPorDescricao(descricao: string, estabelecimentoId: string): Promise<QualidadeItem | null>;
  listar(criterio: CriterioListagem): Promise<QualidadeItem[]>;
  contar(estabelecimentoId: string, termo?: string | undefined): Promise<number>;
  salvar(qualidade: QualidadeItem): Promise<void>;
  excluir(id: string): Promise<void>;
}

/** CentroTrabalhoItem não busca por texto — filtra opcionalmente por item/centro. */
export interface CriterioListagemCentroTrabalhoItem {
  estabelecimentoId: string;
  startIndex: number;
  maxRows: number;
  itemId?: string | undefined;
  centroTrabalhoId?: string | undefined;
}

export interface CentroTrabalhoItemRepository {
  buscarPorId(id: string, estabelecimentoId: string): Promise<CentroTrabalhoItem | null>;
  buscarPorItemECentro(
    itemId: string,
    centroTrabalhoId: string,
    estabelecimentoId: string,
  ): Promise<CentroTrabalhoItem | null>;
  listar(criterio: CriterioListagemCentroTrabalhoItem): Promise<CentroTrabalhoItem[]>;
  contar(criterio: Omit<CriterioListagemCentroTrabalhoItem, 'startIndex' | 'maxRows'>): Promise<number>;
  salvar(vinculo: CentroTrabalhoItem): Promise<void>;
  excluir(id: string): Promise<void>;
}

export interface ItemRepository {
  buscarPorId(id: string, estabelecimentoId: string): Promise<Item | null>;
  buscarPorCodigo(codigo: string, estabelecimentoId: string): Promise<Item | null>;
  listar(criterio: CriterioListagem): Promise<Item[]>;
  contar(estabelecimentoId: string, termo?: string | undefined): Promise<number>;
  salvar(item: Item): Promise<void>;
  excluir(id: string): Promise<void>;
}

export interface CentroTrabalhoRepository {
  buscarPorId(id: string, estabelecimentoId: string): Promise<CentroTrabalho | null>;
  buscarPorCodigo(codigo: string, estabelecimentoId: string): Promise<CentroTrabalho | null>;
  listar(criterio: CriterioListagem): Promise<CentroTrabalho[]>;
  contar(estabelecimentoId: string, termo?: string | undefined): Promise<number>;
  salvar(centro: CentroTrabalho): Promise<void>;
  excluir(id: string): Promise<void>;
}
