import type { Cracha } from '../entities/cracha.js';

/** Critério de listagem paginada (paridade com CrachaDAO). */
export interface CriterioListagemCracha {
  startIndex: number;
  maxRows: number;
  /** Busca textual opcional sobre código/nome. */
  termo?: string | undefined;
}

/** Port do agregado Crachá. */
export interface CrachaRepository {
  buscarPorId(idCracha: string): Promise<Cracha | null>;
  /** Resolve unicidade de código no tenant (regra do CrachaRN). */
  buscarPorCodigo(codigo: string): Promise<Cracha | null>;
  listar(criterio: CriterioListagemCracha): Promise<Cracha[]>;
  contar(termo?: string | undefined): Promise<number>;
  salvar(cracha: Cracha): Promise<void>;
  excluir(idCracha: string): Promise<void>;
}
