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

export interface LeituraIotRepository {
  /**
   * Grava em lote ignorando duplicatas (chaveEvento). Retorna quantas foram
   * realmente inseridas — o worker usa isso para logar reentregas.
   */
  salvarLote(leituras: LeituraIot[]): Promise<number>;
  listar(criterio: CriterioLeiturasIot): Promise<LeituraIot[]>;
  /** Agregação por porta no período: alimenta os contadores. */
  contarPorEntrada(criterio: CriterioLeiturasIot): Promise<ContagemPorEntrada[]>;
}
