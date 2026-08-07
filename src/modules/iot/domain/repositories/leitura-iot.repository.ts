import type { LeituraIot } from '../entities/leitura-iot.js';
import type { ContextoIot } from '../entities/entrada-iot.js';

/** Janela de consulta das leituras de um dispositivo. */
export interface CriterioLeiturasIot {
  dispositivoId: string;
  de: Date;
  ate: Date;
  input?: number | undefined;
}

/** Total acumulado por porta — é o "contador de peças" da tela. */
export interface ContagemPorEntrada {
  input: number;
  contexto: ContextoIot;
  /** Soma dos valores no período (pulsos de CONTADOR somam 1 cada). */
  total: number;
  /** Quantidade de leituras — distingue "1 leitura de valor 50" de "50 pulsos". */
  ocorrencias: number;
  ultimaLeituraEm: Date | null;
}

/**
 * Estado de uma porta cuja Função é ACIONADO — o firmware reenvia o mesmo
 * valor (0/1) a cada report periódico mesmo sem mudança, então SUM não faz
 * sentido aqui; o que importa é o valor mais recente e quantas vezes ele
 * mudou (transição 0→1 ou 1→0) no período.
 */
export interface EstadoPorEntrada {
  input: number;
  /** Valor da leitura mais recente no período (0 ou 1, tipicamente). */
  valorAtual: number | null;
  /** Quantidade de mudanças de valor entre leituras consecutivas no período. */
  transicoes: number;
  ocorrencias: number;
  ultimaLeituraEm: Date | null;
}

export interface LeituraIotRepository {
  /**
   * Grava em lote ignorando duplicatas (chaveEvento). Retorna quantas foram
   * realmente inseridas — o worker usa isso para logar reentregas.
   */
  salvarLote(leituras: LeituraIot[]): Promise<number>;
  listar(criterio: CriterioLeiturasIot): Promise<LeituraIot[]>;
  /** Agregação por porta no período: alimenta os contadores de Pulso/Pulso fim. */
  contarPorEntrada(criterio: CriterioLeiturasIot): Promise<ContagemPorEntrada[]>;
  /** Estado atual + transições de uma porta ACIONADO no período. */
  estadoDaEntrada(criterio: CriterioLeiturasIot & { input: number }): Promise<EstadoPorEntrada>;
}
