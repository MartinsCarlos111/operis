import type { Etiqueta, MotivoGeracaoEtiqueta, StatusEtiqueta } from '../entities/etiqueta.js';
import type { Rastreabilidade } from '../entities/rastreabilidade.js';

export interface CriterioListagemEtiqueta {
  estabelecimentoId: string;
  ordemProducaoId?: string | undefined;
  status?: StatusEtiqueta | undefined;
  motivo?: MotivoGeracaoEtiqueta | undefined;
  startIndex: number;
  maxRows: number;
}

export interface EtiquetaRepository {
  buscarPorId(id: string, estabelecimentoId: string): Promise<Etiqueta | null>;
  buscarPorCodigo(codigoBarras: string): Promise<Etiqueta | null>;
  listar(criterio: CriterioListagemEtiqueta): Promise<Etiqueta[]>;
  contar(criterio: CriterioListagemEtiqueta): Promise<number>;
  salvar(etiqueta: Etiqueta): Promise<void>;
  /** Próximo sequencial disponível por ordem — para o `ImprimirEtiquetaUseCase`. */
  proximoSequencial(ordemProducaoId: string): Promise<number>;
  /** Lista etiquetas DISPONIVEL de uma ordem para enviar baixa ao ERP. */
  listarDisponiveisPorOrdem(ordemProducaoId: string): Promise<Etiqueta[]>;
}

export interface RastreabilidadeRepository {
  buscarPorId(id: string): Promise<Rastreabilidade | null>;
  listarPorEtiqueta(etiquetaId: string): Promise<Rastreabilidade[]>;
  listarPorOrdemProducao(ordemProducaoId: string): Promise<Rastreabilidade[]>;
  salvar(r: Rastreabilidade): Promise<void>;
}