import type { LayoutEtiqueta } from '../entities/layout-etiqueta.js';

export interface CriterioListagemLayout {
  startIndex: number;
  maxRows: number;
  termo?: string | undefined;
}

/** Port do agregado LayoutEtiqueta. */
export interface LayoutEtiquetaRepository {
  buscarPorId(idLayout: string): Promise<LayoutEtiqueta | null>;
  buscarPorCodigo(codigo: string): Promise<LayoutEtiqueta | null>;
  listar(criterio: CriterioListagemLayout): Promise<LayoutEtiqueta[]>;
  contar(termo?: string | undefined): Promise<number>;
  salvar(layout: LayoutEtiqueta): Promise<void>;
  excluir(idLayout: string): Promise<void>;
}
