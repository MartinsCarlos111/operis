import type { Area } from '../entities/area.js';

/**
 * Critério de listagem paginada, espelhando a assinatura do AreaDAO legado
 * (startRowIndex/maximumRows/filterExpression), porém com filtro tipado — o
 * legado montava SQL por string; aqui o filtro é traduzido para Prisma.where
 * na camada de infraestrutura.
 */
export interface CriterioListagemArea {
  estabelecimentoId: string;
  startIndex: number;
  maxRows: number;
  /** Busca textual opcional sobre código/descrição (substitui jsonConditions). */
  termo?: string | undefined;
}

/** Port do agregado Área. Implementado por PrismaAreaRepository. */
export interface AreaRepository {
  buscarPorId(idArea: string, estabelecimentoId: string): Promise<Area | null>;
  /** Resolve unicidade de código dentro do estabelecimento (regra do AreaRN). */
  buscarPorCodigo(codigo: string, estabelecimentoId: string): Promise<Area | null>;
  listar(criterio: CriterioListagemArea): Promise<Area[]>;
  contar(estabelecimentoId: string, termo?: string | undefined): Promise<number>;
  salvar(area: Area): Promise<void>;
  excluir(idArea: string): Promise<void>;
  /** Nº de usuários vinculados à área — bloqueia exclusão (regra do AreaRN). */
  contarUsuariosVinculados(idArea: string): Promise<number>;
}
