import type { Ferramenta } from '../entities/ferramenta.js';

export interface CriterioListagemFerramenta {
  estabelecimentoId: string;
  termo?: string | undefined;
  startIndex: number;
  maxRows: number;
}

export interface FerramentaRepository {
  buscarPorId(id: string, estabelecimentoId: string): Promise<Ferramenta | null>;
  buscarPorCodigo(codigo: string, estabelecimentoId: string): Promise<Ferramenta | null>;
  listar(criterio: CriterioListagemFerramenta): Promise<Ferramenta[]>;
  contar(criterio: CriterioListagemFerramenta): Promise<number>;
  salvar(ferramenta: Ferramenta): Promise<void>;
  excluir(id: string): Promise<void>;
}