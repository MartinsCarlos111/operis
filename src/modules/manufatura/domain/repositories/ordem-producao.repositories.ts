import type { OrdemProducao } from '../entities/ordem-producao.js';

export interface CriterioOrdemProducao {
  estabelecimentoId: string;
  startIndex: number;
  maxRows: number;
  termo?: string | undefined;
  status?: string | undefined;
}

export interface OrdemProducaoRepository {
  buscarPorId(id: string, estabelecimentoId: string): Promise<OrdemProducao | null>;
  buscarPorIdentidade(codigo: string, identificador: string): Promise<OrdemProducao | null>;
  listar(criterio: CriterioOrdemProducao): Promise<OrdemProducao[]>;
  contar(criterio: Omit<CriterioOrdemProducao, 'startIndex' | 'maxRows'>): Promise<number>;
  salvar(ordem: OrdemProducao): Promise<void>;
}
