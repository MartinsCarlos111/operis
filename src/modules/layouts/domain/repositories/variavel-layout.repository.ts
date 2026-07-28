import type { VariavelLayout } from '../entities/variavel-layout.js';

export interface CriterioListagemVariavel {
  startIndex: number;
  maxRows: number;
  termo?: string | undefined;
}

/** Port do agregado VariavelLayout. */
export interface VariavelLayoutRepository {
  buscarPorId(idVariavel: string): Promise<VariavelLayout | null>;
  buscarPorCodigo(codigo: string): Promise<VariavelLayout | null>;
  listar(criterio: CriterioListagemVariavel): Promise<VariavelLayout[]>;
  contar(termo?: string | undefined): Promise<number>;
  salvar(variavel: VariavelLayout): Promise<void>;
  excluir(idVariavel: string): Promise<void>;
}
