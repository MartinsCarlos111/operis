import type { Movimento, TipoMovimento } from '../entities/movimento.js';

export interface CriterioListagemMovimento {
  estabelecimentoId: string;
  startIndex: number;
  maxRows: number;
  centroTrabalhoId?: string | undefined;
  ordemProducaoId?: string | undefined;
  tipo?: TipoMovimento | undefined;
}

export interface MovimentoRepository {
  buscarPorId(id: string, estabelecimentoId: string): Promise<Movimento | null>;
  /**
   * ex-`BuscarMovimentoAberto(idCentroTrabalho, tiposMovimento[])`: o movimento
   * ainda sem fim mais recente (por início) de um dos tipos, num centro. É o
   * que garante o não-paralelismo — não pode haver dois Reporte/Preparação/
   * Parada abertos ao mesmo tempo na mesma máquina.
   */
  buscarAberto(centroTrabalhoId: string, tipos: TipoMovimento[]): Promise<Movimento | null>;
  listar(criterio: CriterioListagemMovimento): Promise<Movimento[]>;
  contar(criterio: CriterioListagemMovimento): Promise<number>;
  salvar(movimento: Movimento): Promise<void>;
}

/**
 * Porta do catálogo de classificações. Existe separada porque o
 * `MovimentosRN.ValidarMovimento` faz algo peculiar: quando o movimento vem do
 * TERMINAL e o tipo informado não está cadastrado, ele **cria o tipo na hora**
 * em vez de recusar — o chão de fábrica não pode parar por falta de cadastro.
 * Vindo do site, o mesmo caso é erro.
 */
export interface CatalogoTipos {
  resolverParada(codigo: string, estabelecimentoId: string, autocadastrar: boolean): Promise<string | null>;
  resolverRefugo(codigo: string, estabelecimentoId: string, autocadastrar: boolean): Promise<string | null>;
  resolverCausa(codigo: string, estabelecimentoId: string, autocadastrar: boolean): Promise<string | null>;
  resolverRecusa(codigo: string, estabelecimentoId: string, autocadastrar: boolean): Promise<string | null>;
}
