import type { CalculoIndicadores, ContribuicaoMovimento } from '../entities/calculo-indicadores.js';
import type { MovimentoCalculoIndicadores } from '../entities/movimento-calculo-indicadores.js';

export interface CriterioListagemCalculoIndicadores {
  estabelecimentoId: string;
  /** Filtro opcional por centro de trabalho. */
  centroTrabalhoId?: string | undefined;
  /** Filtro opcional por turno. */
  turnoId?: string | undefined;
  /** Início do intervalo (inclusive). */
  dataInicio?: Date | undefined;
  /** Fim do intervalo (exclusive). */
  dataFim?: Date | undefined;
  startIndex: number;
  maxRows: number;
}

/**
 * Porta do agregado `CalculoIndicadores`. `salvar` persiste o agregado junto
 * de seus detalhes (MovimentosCalculoIndicadores) — paridade com
 * `CadastrarPreCalculosEOEE` que fazia INSERT em ambas as tabelas.
 */
export interface CalculoIndicadoresRepository {
  /** Busca o agregado por chave única (centro+turno+dia). */
  buscarPorChave(
    centroTrabalhoId: string,
    turnoId: string | null,
    diaTurno: Date,
  ): Promise<CalculoIndicadores | null>;
  buscarPorId(id: string): Promise<CalculoIndicadores | null>;
  /** Lista agregados por intervalo de dia (inclui a consolidação `turnoId=null`). */
  listar(criterio: CriterioListagemCalculoIndicadores): Promise<CalculoIndicadores[]>;
  contar(criterio: CriterioListagemCalculoIndicadores): Promise<number>;
  /**
   * Persiste o agregado e seus detalhes (MovimentoCalculoIndicadores) — o
   * serviço coordena a transação internamente: detalhes obsoletos (movimentoId
   * não presentes) são descartados para que um recálculo completo seja idempotente.
   */
  salvar(
    calculo: CalculoIndicadores,
    detalhes: ReadonlyArray<MovimentoCalculoIndicadores>,
  ): Promise<void>;
}

/**
 * Porta de leitura dos Movimentos do tenant — usada pelo `MontarOeeService`
 * para listar os movimentos "a calcular" de um turno. Não expõe mutação: o
 * módulo indicadores apenas LÊ do módulo manufatura (fronteira protegida).
 */
export interface FonteMovimentos {
  /** Traz os movimentos do turno cuja `(inicio)` cai na janela; opcionalmente
   *  só os `recalcular=true` (paridade com `ListarMovimentosCalcularOEE`). */
  listarPorJanela(
    centroTrabalhoId: string,
    inicio: Date,
    fim: Date,
    soRecalcular: boolean,
  ): Promise<ReadonlyArray<ContribuicaoMovimento & { movimentoId: string; turnoId: string }>>;
}